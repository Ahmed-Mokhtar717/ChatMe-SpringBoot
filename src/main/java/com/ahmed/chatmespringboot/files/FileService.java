package com.ahmed.chatmespringboot.files;

import com.ahmed.chatmespringboot.chatroom.ChatRoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FileService {

    private final FileRepository fileRepository;
    private final ChatRoomService chatRoomService;

    public File save(File File) {
        var chatId = chatRoomService.getChatRoomId(
                File.getSenderId(),
                File.getRecipientId(),
                true
        ).orElseThrow();

        File.setChatId(chatId);
        File.setUploadTime(new Date());
        return fileRepository.save(File);
    }

    public List<File> findChatFiles(String senderId, String recipientId) {
        var chatId = chatRoomService.getChatRoomId(
                senderId,
                recipientId,
                false
        );
        return chatId.map(fileRepository::findByChatId).orElse(new ArrayList<>());
    }
}