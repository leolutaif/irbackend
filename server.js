const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const ASAAS_API_KEY = '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ6OjAwMDAwMDAwMDAwMDAwODUwNzk6OiRhYWNoXzNiODYzMjcyLWQ3NTMtNGE4NC05MDIyLWMwNjY5NzE5OGE2Yw=='; // Substitua pela sua key do Asaas
const ASAAS_API_URL = 'https://sandbox.asaas.com/api/v3';

// Em memória para exemplo; em produção, use um banco de dados
const payments = {};

// Rota para criar pagamento
app.post('/create-payment', async (req, res) => {
    const { name, email, phone, cpf, value, paymentMethod } = req.body;
    const dueDate = new Date().toISOString().split('T')[0]; // Data atual

    console.log('Dados recebidos:', req.body);

    try {
        // Criação do cliente
        const customerResponse = await axios.post(`${ASAAS_API_URL}/customers`, {
            name,
            email,
            phone,
            cpfCnpj: cpf,
            personType: 'FISICA'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY,
            },
        });

        console.log('Resposta do cliente:', customerResponse.data);

        const customerId = customerResponse.data.id;

        // Criação da cobrança
        const paymentData = {
            customer: customerId,
            billingType: paymentMethod, // Tipo de cobrança
            dueDate, // Data de vencimento do pagamento
            value,
        };

        console.log('Dados do pagamento:', paymentData);

        const paymentResponse = await axios.post(`${ASAAS_API_URL}/payments`, paymentData, {
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY,
            },
        });

        console.log('Resposta do pagamento:', paymentResponse.data);

        // Salvar o pagamento em memória (substitua por banco de dados em produção)
        payments[paymentResponse.data.id] = { status: 'PENDING' };

        res.json(paymentResponse.data);
    } catch (error) {
        console.error('Erro ao criar pagamento:', error.response ? error.response.data : error.message);
        res.status(500).send('Erro ao criar pagamento');
    }
});

// Rota para verificar o status do pagamento
app.get('/payment-status/:id', async (req, res) => {
    const paymentId = req.params.id;

    try {
        const paymentResponse = await axios.get(`${ASAAS_API_URL}/payments/${paymentId}`, {
            headers: {
                'Content-Type': 'application/json',
                'access_token': ASAAS_API_KEY,
            },
        });

        res.json({ status: paymentResponse.data.status });
    } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error.response ? error.response.data : error.message);
        res.status(500).send('Erro ao verificar status do pagamento');
    }
});

// Rota do webhook para receber notificações do Asaas
app.post('/asaas-webhook', async (req, res) => {
    const event = req.body;

    console.log('Webhook recebido:', event);

    // Verifique o evento de webhook e atualize o status do pagamento no seu banco de dados
    if (event.event === 'PAYMENT_RECEIVED') {
        const paymentId = event.payment.id;

        // Atualize o status do pagamento no banco de dados
        payments[paymentId] = { status: 'COMPLETED' };
        console.log(`Pagamento ${paymentId} atualizado para o status COMPLETED`);
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
