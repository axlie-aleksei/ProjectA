const path = require("path");
const express = require("express");

function staticFiles(app) {
  // Статика: CSS, JS, картинки
  app.use("/public", express.static(path.join(__dirname, "..", "..", "public")));

  // Главная страница
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "..", "views", "index.html"));
  });

  // Любой HTML файл из views
  app.get("/:page", (req, res) => {
    const page = req.params.page;
    // Ограничиваем, чтобы ловить только .html
    if (!page.endsWith(".html")) return res.status(404).send("Page not found");

    const filePath = path.join(__dirname, "..", "..", "views", page);
    res.sendFile(filePath, (err) => {
      if (err) res.status(404).send("Page not found");
    });
  });
}

module.exports = staticFiles;
