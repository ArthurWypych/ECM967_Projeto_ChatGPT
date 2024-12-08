from rest_framework import serializers

class ReferenceSerializer(serializers.Serializer):
    data = serializers.CharField()