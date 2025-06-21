package com.ahmed.chatmespringboot.files;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document
public class File {
    @Id
    private String id;
    private String chatId;
    private String senderId;
    private String recipientId;
    private String fileName;
    private String fileType; // image/png, application/pdf, etc.
    private byte[] data;
    private Date uploadTime;
}
