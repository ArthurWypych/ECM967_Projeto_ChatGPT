import requests
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Reference
from .serializers import ReferenceSerializer

class ReferenceAPIView(APIView):
    def post(self, request):
        serializer = ReferenceSerializer(data=request.data)
        if serializer.is_valid():
            original_data = serializer.validated_data['data']

            # Configurar o acesso à API do ChatGPT
            api_url = "https://api.openai.com/v1/completions"
            headers = {
                "Authorization": f"Bearer your-api-key",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "text-davinci-003",
                "prompt": f"Formate a seguinte referência no estilo ABNT: {original_data}",
                "max_tokens": 200,
            }

            formatted_data = "internal server error"  # Valor padrão em caso de erro

            try:
                # Enviar requisição para a API do ChatGPT
                response = requests.post(api_url, json=payload, headers=headers)
                response_data = response.json()
                
                # Extrair resposta do ChatGPT
                formatted_data = response_data.get('choices', [{}])[0].get('text', '').strip()
                if not formatted_data:
                    formatted_data = "internal server error"

            except Exception as e:
                # Log de erro opcional (não exposto para o cliente)
                print(f"Erro ao conectar com o ChatGPT: {str(e)}")

            # Salvar no banco de dados
            reference = Reference.objects.create(
                original_data=original_data,
                formatted_data=formatted_data
            )

            return Response({
                "id": reference.id,
                "original_data": original_data,
                "formatted_data": formatted_data,
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)