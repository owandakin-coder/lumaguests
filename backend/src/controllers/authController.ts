import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePasswords, generateToken } from '../utils/auth';
import { ApiResponse } from '../types';

interface AuthRequest extends Request {
  userId?: string;
}

const prisma = new PrismaClient();

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  token: string;
}

// Register
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name }: RegisterInput = req.body;

    // Validation
    if (!email || !password) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Email and password are required',
      };
      return res.status(400).json(response);
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Email already registered',
      };
      return res.status(400).json(response);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name: name || undefined,
      },
    });

    // Generate token
    const token = generateToken(user.id);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
        },
        token,
      },
      message: 'Registered successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage,
    };
    res.status(500).json(response);
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginInput = req.body;

    // Validation
    if (!email || !password) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Email and password are required',
      };
      return res.status(400).json(response);
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid email or password',
      };
      return res.status(401).json(response);
    }

    // Compare passwords
    const isPasswordValid = await comparePasswords(password, user.password);

    if (!isPasswordValid) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid email or password',
      };
      return res.status(401).json(response);
    }

    // Generate token
    const token = generateToken(user.id);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
        },
        token,
      },
      message: 'Logged in successfully',
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage,
    };
    res.status(500).json(response);
  }
};

// Get current user
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Unauthorized',
      };
      return res.status(401).json(response);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<{
      id: string;
      email: string;
      name?: string;
    }> = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
      },
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const response: ApiResponse<null> = {
      success: false,
      error: errorMessage,
    };
    res.status(500).json(response);
  }
};
