package com.ahmed.chatmespringboot.files;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface FileRepository extends MongoRepository<File, String> {

    List<File> findByChatId(String chatId);
}