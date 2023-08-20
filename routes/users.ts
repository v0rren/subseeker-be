import express, { Router, Request, Response, NextFunction } from 'express';

const router: Router = express.Router();

/* GET users listing. */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  console.log('Received GET request to /users');
  res.send('respond with a resource');
});

export default router;
