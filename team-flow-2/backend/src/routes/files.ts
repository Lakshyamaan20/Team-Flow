import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "../db/index";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`;
    cb(null, unique);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload/:taskId", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const attachment = await prisma.attachment.create({
      taskId: req.params.taskId,
      userId: req.user!.id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
    res.json(attachment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:taskId", async (req: AuthRequest, res: Response) => {
  try {
    const files = await prisma.attachment.findMany({ where: { taskId: req.params.taskId }, orderBy: { createdAt: "desc" } });
    res.json(files);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/download/:id", async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.attachment.findUnique({ id: req.params.id });
    if (!file) return res.status(404).json({ error: "File not found" });
    const filePath = path.join(UPLOADS_DIR, file.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found on disk" });
    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    res.setHeader("Content-Type", file.mimeType);
    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.attachment.findUnique({ id: req.params.id });
    if (!file) return res.status(404).json({ error: "File not found" });
    const filePath = path.join(UPLOADS_DIR, file.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await prisma.attachment.delete({ id: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
