import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private authService: AuthService,
  ) {}

  @Get()
  findAll() {
    return this.usersRepository.find();
  }

  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Post()
  create(@Body() user: any) {
    // Use AuthService to register so password gets hashed
    return this.authService.register(user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUser: Partial<User>) {
    return this.usersRepository.update(id, updateUser);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const userToDelete = await this.usersRepository.findOneBy({
      id: parseInt(id),
    });
    if (userToDelete && userToDelete.username === 'admin') {
      throw new Error('Cannot delete the main Admin user');
    }
    return this.usersRepository.delete(id);
  }
}
