// src/events/publisher.js
const amqplib = require('amqplib');

let channel = null;

async function connectRabbitMQ() {
    const connection = await amqplib.connect(
        process.env.RABBITMQ_URL || 'amqp://localhost'
    );

    connection.on('error', (err) => {
        console.error('RabbitMQ 연결 에러:', err);
        channel = null;
    });

    connection.on('close', () => {
        console.warn('RabbitMQ 연결 끊김, 재연결 시도...');
        channel = null;
        setTimeout(connectRabbitMQ, 3000);
    });

    channel = await connection.createChannel();

    // Auth 전용 Exchange
    await channel.assertExchange('auth.events', 'topic', { durable: true });

    console.log('Auth RabbitMQ 연결 완료');
}

async function publish(routingKey, payload) {
    if (!channel) await connectRabbitMQ();
    channel.publish(
        'auth.events',
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
    );
    console.log(`[Event 발행] ${routingKey}:`, payload);
}

module.exports = { connectRabbitMQ, publish };
