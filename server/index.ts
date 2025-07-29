import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("WebSocket signaling server is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// export default app;
// export { app, PORT };
// export type { Express } from 'express';
// export { express };
// export { default as WebSocket } from 'ws';
// export { v4 as uuidv4 } from 'uuid';
