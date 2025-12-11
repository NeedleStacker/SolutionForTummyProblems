const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: 'liveinsb_recipes'
});

db.connect(err => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database.');
});

app.get('/api/recipes', (req, res) => {
  const { search, site } = req.query;
  let sql = 'SELECT * FROM recipes WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (title LIKE ? OR ingredients LIKE ? OR ner LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (site) {
    sql += ' AND site = ?';
    params.push(site);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    res.json(results);
  });
});

app.get('/api/recipes/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM recipes WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      res.status(500).send(err);
      return;
    }
    if (results.length === 0) {
      res.status(404).send('Recipe not found');
      return;
    }
    res.json(results[0]);
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
