import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import https from "https";

// Configurações da API OpenAI
const OPENAI_API_URL = "api.openai.com";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Substitua pela sua chave OpenAI.

// Configurando o cliente DynamoDB
const dynamoDBClient = new DynamoDBClient({});
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

export const handler = async (event) => {
    try {
        // Parseando o corpo da requisição
        const body = JSON.parse(event.body);
        const userInput = body.data;

        if (!userInput) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Missing 'data' field in request body" }),
            };
        }

        // Fazendo a requisição para a API do ChatGPT usando https
        const postData = JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Você é um assistente que gera referências no formato ABNT." },
                { role: "user", content: userInput },
            ],
        });

        const options = {
            hostname: OPENAI_API_URL,
            path: "/v1/chat/completions",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
                "Content-Length": Buffer.byteLength(postData),
            },
        };

        // Enviando a requisição
        const openAIResponse = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = "";

                res.on("data", (chunk) => {
                    data += chunk;
                });

                res.on("end", () => {
                    try {
                        const responseData = JSON.parse(data);
                        resolve(responseData);
                    } catch (error) {
                        reject(new Error("Erro ao parsear a resposta da API OpenAI."));
                    }
                });
            });

            req.on("error", (error) => {
                console.error("Error in OpenAI request:", error);
                reject(error);
            });

            req.write(postData);
            req.end();
        });

        // Log para ver a resposta da API
        console.log("openAIResponse:", openAIResponse);

        // Verificando se a resposta contém 'choices' corretamente
        if (openAIResponse.choices && openAIResponse.choices.length > 0) {
            const chatGPTOutput = openAIResponse.choices[0].message.content;

            // Salvando no DynamoDB
            const item = {
                id: Date.now().toString(), // ID único (timestamp)
                userInput: userInput, // Requisição enviada ao ChatGPT
                chatGPTResponse: chatGPTOutput, // Resposta do ChatGPT
                timestamp: new Date().toISOString(), // Timestamp da transação
            };

            await dynamoDB.send(
                new PutCommand({
                    TableName: "GPT_project",
                    Item: item,
                })
            );

            // Retornando a resposta ao cliente
            return {
                statusCode: 200,
                body: JSON.stringify({ reference: chatGPTOutput }),
            };
        } else {
            throw new Error("No choices found in response from OpenAI.");
        }
    } catch (error) {
        console.error("Error:", error);

        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal server error", details: error.message }),
        };
    }
};