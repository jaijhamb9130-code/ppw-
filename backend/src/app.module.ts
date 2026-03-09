import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UserController } from './user.controller';
import { AppService } from './app.service';
import { Ledger } from './entities/ledger.entity';
import { StockItem } from './entities/stock-item.entity';
import { Order } from './entities/order.entity';
import { OrderDetail } from './entities/order-detail.entity';
import { User } from './entities/user.entity';
import { GodownEntry } from './entities/godown-entry.entity';
import { GodownController } from './godown.controller';
import { TallyService } from './tally.service';
import { AuthModule } from './auth/auth.module';
@Module({
  imports: [
    AuthModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', '127.0.0.1'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'tally_sync'),
        entities: [Ledger, StockItem, Order, OrderDetail, User, GodownEntry],
        synchronize: process.env.NODE_ENV !== 'production', // Prevent auto-create tables in production to protect data
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      Ledger,
      StockItem,
      Order,
      OrderDetail,
      User,
      GodownEntry,
    ]),
  ],
  controllers: [AppController, UserController, GodownController],
  providers: [AppService, TallyService],
})
export class AppModule {}
