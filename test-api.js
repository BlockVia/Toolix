// Use local native fetch

async function testApi() {
    try {
        const response = await fetch('https://toolix.fun/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'apidebuguser2',
                email: 'apidebuguser2@example.com',
                password: 'password123'
            })
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Body:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testApi();
