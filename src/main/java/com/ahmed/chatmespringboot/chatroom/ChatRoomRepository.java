package com.ahmed.chatmespringboot.chatroom;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface ChatRoomRepository extends MongoRepository<ChatRoom, String> {

    Optional<ChatRoom> findBySernderIdAndRecipientId(String senderId, String recipientId);
}
