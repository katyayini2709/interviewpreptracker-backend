const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());


const driver = neo4j.driver(
    "neo4j+s://483b1eb8.databases.neo4j.io",
    neo4j.auth.basic("neo4j", "cDR7fw2WZIz0wq6kuz5dm2DwP6qCywW2m6CrQtM")
);

const PORT = process.env.PORT || 5000;

// ===== REGISTER =====
app.post('/api/register', async (req, res) => {
    const session = driver.session();
    try {
        const { name, email, password } = req.body;

        const result = await session.run(
            `CREATE (u:User {
                id: $id,
                name: $name,
                email: $email,
                password: $password
            }) RETURN u`,
            {
                id: Date.now().toString(),
                name,
                email,
                password
            }
        );

        res.json(result.records[0].get('u').properties);

    } catch (err) {
        console.log("REGISTER ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== LOGIN =====
app.post('/api/login', async (req, res) => {
    const session = driver.session();
    try {
        const { email, password } = req.body;

        const result = await session.run(
            `MATCH (u:User {email: $email, password: $password})
             RETURN u`,
            { email, password }
        );

        if (result.records.length === 0) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        res.json(result.records[0].get('u').properties);

    } catch (err) {
        console.log("LOGIN ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== ADD QUESTION =====
app.post('/api/questions', async (req, res) => {
    const session = driver.session();
    try {
        const { userId, question, company, subject, difficulty } = req.body;

        const result = await session.run(
            `
            MATCH (u:User {id: $userId})
            CREATE (q:Question {
                id: $id,
                question: $question,
                company: $company,
                subject: $subject,
                difficulty: $difficulty,
                completed: false,
                createdAt: datetime()
            })
            CREATE (u)-[:HAS]->(q)
            RETURN q
            `,
            {
                id: Date.now().toString(),
                userId,
                question,
                company,
                subject,
                difficulty
            }
        );

        res.json(result.records[0].get('q').properties);

    } catch (err) {
        console.log("ADD QUESTION ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== GET QUESTIONS =====
app.get('/api/questions/:userId', async (req, res) => {
    const session = driver.session();
    try {
        const result = await session.run(
            `
            MATCH (u:User {id: $userId})-[:HAS]->(q:Question)
            RETURN q ORDER BY q.createdAt DESC
            `,
            { userId: req.params.userId }
        );

        const data = result.records.map(r => r.get('q').properties);
        res.json(data);

    } catch (err) {
        console.log("GET QUESTION ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== ADD MATERIAL =====
app.post('/api/materials', async (req, res) => {
    const session = driver.session();
    try {
        const { userId, title, link } = req.body;

        const result = await session.run(
            `
            MATCH (u:User {id: $userId})
            CREATE (m:Material {
                id: $id,
                title: $title,
                link: $link
            })
            CREATE (u)-[:HAS_MATERIAL]->(m)
            RETURN m
            `,
            {
                id: Date.now().toString(),
                userId,
                title,
                link
            }
        );

        res.json(result.records[0].get('m').properties);

    } catch (err) {
        console.log("MATERIAL ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== SERVER =====
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
