import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserPreferencesDto } from '../auth/dto';

@Injectable()
export class UserPreferencesService {
  constructor(private prisma: PrismaService) {}

  async getPreferences(userId: string) {
    // Find or create preferences
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences if not exists
      preferences = await this.prisma.userPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  async updatePreferences(userId: string, dto: UpdateUserPreferencesDto) {
    // Upsert preferences (create if not exists, update if exists)
    const preferences = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });

    return preferences;
  }
}
