import { Request as ExpressRequest } from 'express';

export type Request = ExpressRequest & {
  mode: string;
};
