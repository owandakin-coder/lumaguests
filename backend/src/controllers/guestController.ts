import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CreateGuestInput, UpdateGuestInput, ApiResponse, Stats } from '../types';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  userId?: string;
}

// Get all guests for current user
export const getAllGuests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const guests = await prisma.guest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const response: ApiResponse<typeof guests> = {
      success: true,
      data: guests,
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

// Get guest by ID
export const getGuestById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const guest = await prisma.guest.findFirst({
      where: { id, userId },
    });

    if (!guest) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Guest not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof guest> = {
      success: true,
      data: guest,
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

// Create guest
export const createGuest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { fullName, phone, companions, category, rsvpStatus, notes }: CreateGuestInput = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Validation
    if (!fullName || !phone || !category || !rsvpStatus) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Missing required fields',
      };
      return res.status(400).json(response);
    }

    // Check for duplicate phone (per user)
    const existingGuest = await prisma.guest.findFirst({
      where: { userId, phone },
    });

    if (existingGuest) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'A guest with this phone number already exists',
      };
      return res.status(400).json(response);
    }

    const guest = await prisma.guest.create({
      data: {
        userId,
        fullName,
        phone,
        companions: companions || 0,
        category,
        rsvpStatus,
        notes: notes || '',
      },
    });

    const response: ApiResponse<typeof guest> = {
      success: true,
      data: guest,
      message: 'Guest created successfully',
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

// Update guest
export const updateGuest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const updateData: UpdateGuestInput = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Check if guest exists and belongs to user
    const existingGuest = await prisma.guest.findFirst({
      where: { id, userId },
    });

    if (!existingGuest) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Guest not found',
      };
      return res.status(404).json(response);
    }

    // Check for duplicate phone if phone is being updated
    if (updateData.phone && updateData.phone !== existingGuest.phone) {
      const phoneExists = await prisma.guest.findFirst({
        where: { userId, phone: updateData.phone },
      });

      if (phoneExists) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'This phone number is already in use',
        };
        return res.status(400).json(response);
      }
    }

    const guest = await prisma.guest.update({
      where: { id },
      data: updateData,
    });

    const response: ApiResponse<typeof guest> = {
      success: true,
      data: guest,
      message: 'Guest updated successfully',
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

// Delete guest
export const deleteGuest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const existingGuest = await prisma.guest.findFirst({
      where: { id, userId },
    });

    if (!existingGuest) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Guest not found',
      };
      return res.status(404).json(response);
    }

    await prisma.guest.delete({
      where: { id },
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'Guest deleted successfully',
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

// Get stats for current user
export const getStats = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const allGuests = await prisma.guest.findMany({
      where: { userId },
    });

    const stats: Stats = {
      totalGuests: allGuests.length,
      confirmedGuests: allGuests.filter((g) => g.rsvpStatus === 'CONFIRMED').length,
      pendingGuests: allGuests.filter((g) => g.rsvpStatus === 'PENDING').length,
      declinedGuests: allGuests.filter((g) => g.rsvpStatus === 'DECLINED').length,
      totalPeople: allGuests.reduce((sum, g) => sum + 1 + g.companions, 0),
    };

    const response: ApiResponse<Stats> = {
      success: true,
      data: stats,
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
