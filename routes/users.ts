import express, { Router, Request, Response, NextFunction } from 'express';

const router: Router = express.Router();

/* GET users listing. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  console.log('Received GET request to /users');
  res.json({ message: 'Hello, World!' });});

export default router;
