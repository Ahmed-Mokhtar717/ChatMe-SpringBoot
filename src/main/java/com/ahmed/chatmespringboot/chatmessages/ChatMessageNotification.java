package com.ahmed.chatmespringboot.chatmessages;


import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ChatMessageNotification {
    private String id;
    private String senderId;
    private String recipientId;
    private String content;
}
