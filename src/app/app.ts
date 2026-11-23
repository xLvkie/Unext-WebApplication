import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AiChatWidget } from './shared/components/ai-chat-widget/ai-chat-widget';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AiChatWidget],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'unext-web-application';
}