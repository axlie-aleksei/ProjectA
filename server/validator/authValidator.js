module.exports = function (req, res, next) {
  const { username, email, password } = req.body;

  const loginReg = /^[A-Za-z0-9_]{3,20}$/;
  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordReg = /^[A-Za-z0-9!@#$%^&*]{6,32}$/;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "Fill all fields" });
  }

  if (!loginReg.test(username)) {
    return res.status(400).json({ error: "Username must be 3-20 characters" });
  }

  if (!emailReg.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  if (!passwordReg.test(password)) {
    return res.status(400).json({ error: "Password must be 6-32 characters" });
  }

  next();
};
