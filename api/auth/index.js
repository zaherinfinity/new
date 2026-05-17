const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const db = require('../../db');

function getUser(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const notes = await db.getNotesByUser(user.id);
      res.status(200).json(notes);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  } 
  else if (req.method === 'POST') {
    try {
      const { content } = req.body;
      if (!content || content.trim() === '') {
        return res.status(400).json({ error: 'Note content required' });
      }
      const note = await db.createNote(user.id, content);
      res.status(201).json(note);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create note' });
    }
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
