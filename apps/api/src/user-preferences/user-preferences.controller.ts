import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserPreferencesService } from './user-preferences.service';
import { UpdateUserPreferencesDto } from '../auth/dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('user-preferences')
@Controller('user-preferences')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class UserPreferencesController {
  constructor(private userPreferencesService: UserPreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@CurrentUser() user: any) {
    return this.userPreferencesService.getPreferences(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.userPreferencesService.updatePreferences(user.id, dto);
  }
}
