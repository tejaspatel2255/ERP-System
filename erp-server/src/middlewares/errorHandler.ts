import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error Handler Caught:', err);

    if (err instanceof ZodError) {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.flatten().fieldErrors,
        });
    }

    if (err.name === 'ValidationError') {
        // Mongoose validation error
        return res.status(400).json({
            error: 'Database Validation Error',
            details: err.message,
        });
    }

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        error: message,
    });
};
