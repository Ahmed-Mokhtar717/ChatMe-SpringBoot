package com.ahmed.chatmespringboot.chatroom;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;

    public Optional<String> getChatRoomId(
            String senderId,
            String recipientId,
            boolean createNewRoomIfNotExists
    ) {
        return chatRoomRepository.findBySernderIdAndRecipientId(senderId, recipientId)
                .map(ChatRoom::getId)
                .or(() -> {
                   if (createNewRoomIfNotExists) {
                       var chatId= createChatId(senderId, recipientId);
                       return Optional.of(chatId);
                   }
                   return Optional.empty();
                });
    }

    private String createChatId(String senderId, String recipientId) {
        var chatId = String.format("%s-%s", senderId, recipientId); //user1_user2

        ChatRoom senderResipient = ChatRoom.builder()
                .chatId(chatId)
                .serderId(senderId)
                .recipientId(recipientId)
                .build();

        ChatRoom resipientSender = ChatRoom.builder()
                .chatId(chatId)
                .serderId(recipientId)
                .recipientId(senderId)
                .build();

        chatRoomRepository.save(senderResipient);
        chatRoomRepository.save(resipientSender);
        return chatId;
    }
}
