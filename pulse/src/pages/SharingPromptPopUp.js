import React, { useEffect, useState, useRef } from 'react';
import {ALL_DOMAINS} from "../missions/missionPools";

/*
logic for share prompt in each domain

mood tracker

1. automatic prompt option
if saveAndContinueButtonIsClicked = true
progressSharePrompt window >
    window box:
    title "share"
    share prompt template carousel selection
    button: post

    if promptTemplate[number] is true && buttonIsClicked is true
    promptTemplate = new selectedTemplate

    if buttonIsClicked >
       taken to social feed / in post editing window >
       input: title (pre-filled/can be edited)
       input: comment (optional)
       selectedTemplate
       post

2. manual share prompt option
sharePrompt button in top right corner
if buttonIsClicked = true
progressSharePrompt window >
" " - from first option

fitness tracker
1. automatic prompt option
if addButtonIsClicked = true
progressSharePrompt window >
    window box:
    title "share"
    share prompt template carousel selection
    button: post

    if promptTemplate[number] is true && buttonIsClicked is true
    promptTemplate = new selectedTemplate

    if buttonIsClicked >
       taken to social feed / in post editing window >
       input: title (pre-filled/can be edited)
       input: comment (optional)
       selectedTemplate
       post

2. manual share prompt option
sharePrompt button in top right corner
if buttonIsClicked = true
progressSharePrompt window >
" " - from first option

todo
if task is completed  
 */