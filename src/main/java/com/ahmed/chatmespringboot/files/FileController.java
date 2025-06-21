package com.ahmed.chatmespringboot.files;

import com.ahmed.chatmespringboot.files.File;
import com.ahmed.chatmespringboot.files.FileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/files")
public class FileController {

    private final FileService fileService;
    private final SimpMessagingTemplate messagingTemplate;

    @PostMapping("/upload")
    public ResponseEntity<File> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("senderId") String senderId,
            @RequestParam("recipientId") String recipientId
    ) throws IOException {

        File chatFile = File.builder()
                .fileName(file.getOriginalFilename())
                .fileType(file.getContentType())
                .data(file.getBytes())
                .senderId(senderId)
                .recipientId(recipientId)
                .build();

        File savedFile = fileService.save(chatFile);

        // إرسال إشعار WebSocket للمستلم
        messagingTemplate.convertAndSendToUser(
                recipientId,
                "/queue/files",
                savedFile
        );

        return ResponseEntity.ok(savedFile);
    }

    @GetMapping("/{senderId}/{recipientId}")
    public ResponseEntity<List<File>> getFilesBetweenUsers(
            @PathVariable String senderId,
            @PathVariable String recipientId
    ) {
        return ResponseEntity.ok(fileService.findChatFiles(senderId, recipientId));
    }
}