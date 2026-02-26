import express from 'express';
import { ErrorMiddleware } from './Middlewares/error.Middleware';
import { HttpException } from './exceptions/httpException';

export class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares() {
    this.app.use(express.json());
  }

  private initializeRoutes() {
    this.app.get('/success', (req, res) => {
      res.json({ message: 'Working fine!' });
    });

    this.app.get('/error', (req, res) => {
      throw new HttpException(false, 400, 'This is a test error', null, 'Test error');
    });
  }

  private initializeErrorHandling() {
    this.app.use(ErrorMiddleware);
  }
}