import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticate);

const pipelineData = [
  {
    id: "L001", customerName: "Ravi Sharma", phone: "98765-43210", loanType: "Home Loan", amount: 4500000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-06-01" },
      { name: "KYC", status: "completed", date: "2026-06-05" },
      { name: "Verification", status: "completed", date: "2026-06-10" },
      { name: "Approval", status: "in_progress", date: null },
      { name: "Disbursement", status: "pending", date: null },
    ],
  },
  {
    id: "L002", customerName: "Priya Mehta", phone: "99887-76655", loanType: "Business Loan", amount: 12000000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-06-02" },
      { name: "KYC", status: "completed", date: "2026-06-07" },
      { name: "Verification", status: "in_progress", date: null },
      { name: "Approval", status: "pending", date: null },
      { name: "Disbursement", status: "pending", date: null },
    ],
  },
  {
    id: "L003", customerName: "Amit Desai", phone: "97654-32100", loanType: "Car Loan", amount: 850000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-06-03" },
      { name: "KYC", status: "completed", date: "2026-06-06" },
      { name: "Verification", status: "completed", date: "2026-06-09" },
      { name: "Approval", status: "completed", date: "2026-06-12" },
      { name: "Disbursement", status: "in_progress", date: null },
    ],
  },
  {
    id: "L004", customerName: "Sneha Patel", phone: "91234-56789", loanType: "Personal Loan", amount: 300000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-06-04" },
      { name: "KYC", status: "in_progress", date: null },
      { name: "Verification", status: "pending", date: null },
      { name: "Approval", status: "pending", date: null },
      { name: "Disbursement", status: "pending", date: null },
    ],
  },
  {
    id: "L005", customerName: "Vikram Rao", phone: "90123-45678", loanType: "Home Loan", amount: 7500000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-05-28" },
      { name: "KYC", status: "completed", date: "2026-06-02" },
      { name: "Verification", status: "completed", date: "2026-06-08" },
      { name: "Approval", status: "completed", date: "2026-06-14" },
      { name: "Disbursement", status: "completed", date: "2026-06-16" },
    ],
  },
  {
    id: "L006", customerName: "Neha Gupta", phone: "95678-12340", loanType: "Education Loan", amount: 1500000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-06-06" },
      { name: "KYC", status: "completed", date: "2026-06-08" },
      { name: "Verification", status: "in_progress", date: null },
      { name: "Approval", status: "pending", date: null },
      { name: "Disbursement", status: "pending", date: null },
    ],
  },
  {
    id: "L007", customerName: "Deepak Joshi", phone: "93456-78901", loanType: "Business Loan", amount: 20000000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-06-05" },
      { name: "KYC", status: "completed", date: "2026-06-09" },
      { name: "Verification", status: "completed", date: "2026-06-13" },
      { name: "Approval", status: "completed", date: "2026-06-17" },
      { name: "Disbursement", status: "pending", date: null },
    ],
  },
  {
    id: "L008", customerName: "Anjali Kulkarni", phone: "94567-89012", loanType: "Personal Loan", amount: 500000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-06-07" },
      { name: "KYC", status: "completed", date: "2026-06-10" },
      { name: "Verification", status: "completed", date: "2026-06-14" },
      { name: "Approval", status: "in_progress", date: null },
      { name: "Disbursement", status: "pending", date: null },
    ],
  },
  {
    id: "L009", customerName: "Karan Singh", phone: "96789-01234", loanType: "Home Loan", amount: 6000000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-05-25" },
      { name: "KYC", status: "completed", date: "2026-05-30" },
      { name: "Verification", status: "completed", date: "2026-06-05" },
      { name: "Approval", status: "completed", date: "2026-06-11" },
      { name: "Disbursement", status: "completed", date: "2026-06-15" },
    ],
  },
  {
    id: "L010", customerName: "Meera Iyer", phone: "97890-12345", loanType: "Car Loan", amount: 1200000,
    stages: [
      { name: "Lead", status: "completed", date: "2026-06-08" },
      { name: "KYC", status: "in_progress", date: null },
      { name: "Verification", status: "pending", date: null },
      { name: "Approval", status: "pending", date: null },
      { name: "Disbursement", status: "pending", date: null },
    ],
  },
];

router.get("/", async (_req: AuthRequest, res: Response) => {
  res.json(pipelineData);
});

export default router;
