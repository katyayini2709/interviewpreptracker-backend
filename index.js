// ===== IMPORTS =====
const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ===== NEO4J CONNECTION =====
const driver = neo4j.driver(
    "neo4j+s://483b1eb8.databases.neo4j.io",
    neo4j.auth.basic("neo4j", "cDR7fw2WZIz0wq6kuz5dm2DwP6qCywW2tjW2m6CrQtM")
);

const PORT = process.env.PORT || 5000;

// ===== REGISTER =====
app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;
    const session = driver.session();

    try {
        const result = await session.run(
            `CREATE (u:User {
                id: $id,
                name: $name,
                email: $email,
                password: $password
            }) RETURN u`,
            { id: Date.now().toString(), name, email, password }
        );

        res.json(result.records[0].get('u').properties);
    } catch (err) {
        console.log("ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== LOGIN =====
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const session = driver.session();

    try {
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
        console.log("ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== ADD QUESTION =====
app.post('/api/questions', async (req, res) => {
    const { userId, question, company, subject, difficulty } = req.body;
    const session = driver.session();

    try {
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
        console.log("ERROR:", err);
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

        const questions = result.records.map(r => r.get('q').properties);
        res.json(questions);
    } catch (err) {
        console.log("ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== TOGGLE COMPLETE =====
app.put('/api/questions/:id/toggle', async (req, res) => {
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (q:Question {id: $id})
            SET q.completed = NOT q.completed
            RETURN q
            `,
            { id: req.params.id }
        );

        res.json(result.records[0].get('q').properties);
    } catch (err) {
        console.log("ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== DELETE QUESTION =====
app.delete('/api/questions/:id', async (req, res) => {
    const session = driver.session();

    try {
        await session.run(
            `MATCH (q:Question {id: $id}) DETACH DELETE q`,
            { id: req.params.id }
        );

        res.json({ message: "Deleted" });
    } catch (err) {
        console.log("ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== ADD MATERIAL =====
app.post('/api/materials', async (req, res) => {
    const { userId, title, link } = req.body;
    const session = driver.session();

    try {
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
        console.log("ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== GET MATERIALS =====
app.get('/api/materials/:userId', async (req, res) => {
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (u:User {id: $userId})-[:HAS_MATERIAL]->(m:Material)
            RETURN m
            `,
            { userId: req.params.userId }
        );

        const materials = result.records.map(r => r.get('m').properties);
        res.json(materials);
    } catch (err) {
        console.log("ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== DELETE MATERIAL =====
app.delete('/api/materials/:id', async (req, res) => {
    const session = driver.session();

    try {
        await session.run(
            `MATCH (m:Material {id: $id}) DETACH DELETE m`,
            { id: req.params.id }
        );

        res.json({ message: "Deleted" });
    } catch (err) {
        console.log("ERROR:", err);
        res.status(500).json({ error: err.message });
    } finally {
        await session.close();
    }
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
