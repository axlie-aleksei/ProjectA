module.exports = function (req, res, next) {
  const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  // login allows english letters numbers and underscore only
  // this keeps username easy to store and search
  const loginReg = /^[A-Za-z0-9_]{3,20}$/;
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordReg = /^[A-Za-z0-9!@#$%^&*]{6,32}$/;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Fill all fields' });
  }

  if (!loginReg.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  if (!emailReg.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (!passwordReg.test(password)) {
    return res.status(400).json({ error: 'Password must be 6-32 characters' });
  }

  req.body.username = username;
  req.body.email = email;
  req.body.password = password;

  // controller gets already cleaned values
  next();
};
