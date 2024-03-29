import { Module } from "@nestjs/common";
import { TelegramController } from "./telegram.controller";
import { ChatgptService } from "../chatgpt/chatgpt.service";
import { NotionService } from "src/notion/notion.service";
import { DresdenService } from "src/dresden/dresden.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule.forRoot()],
  controllers: [TelegramController],
  providers: [ChatgptService, NotionService, DresdenService],
})
export class TelegramModule {}
