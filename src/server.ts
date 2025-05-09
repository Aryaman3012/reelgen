import app from "./app";

const PORT = process.env.PORT || 3000;

console.log(`[server] Starting server on port ${PORT}...`);
app.listen(PORT, () => {
  console.log(`[server] Server listening on port ${PORT}`);
}); 