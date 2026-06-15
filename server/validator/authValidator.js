module.exports = function (req, res, next) {
  const { email, password } = req.body;

  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordReg = /^[A-Za-z0-9!@#$%^&*]{6,32}$/;

  if (!emailReg.test(email)) {
    return res.status(400).json({ error: "Некорректный email" });
  }

  if (!passwordReg.test(password)) {
    return res.status(400).json({ error: "Пароль должен быть 6–32 символов" });
  }

  next();
};
