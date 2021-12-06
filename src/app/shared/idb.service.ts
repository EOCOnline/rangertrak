import { Injectable, OnInit } from '@angular/core';

import { Observable, of } from 'rxjs';
import { catchError, mergeMap, toArray } from 'rxjs/operators';
import { LocalStorage, StorageMap, JSONSchema } from '@ngx-pwa/local-storage';

@Injectable({
  providedIn: 'root'
})
export class IdbService {

  data$: Observable<string | undefined>;

  constructor(private storageMap: StorageMap) {
    this.data$ = this.storageMap.set('rangerSettings', 'service');
    /*
    this.data$ = this.storageMap.set('rangerSettings', 'service').pipe(
        mergeMap(() => this.storageMap.get('rangerSettings', { type: 'string' })),
      );
      */
  }





}


/*

{@link https://scotch.io/tutorials/mvc-in-an-angular-world}

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observer } from 'rxjs';

export class NoteInfo {
  id: number;
  title: string;
}

export class Note {
  id: number;
  title: string;
  text: string;
}

@Injectable({
  providedIn: 'root'
})

export class NotesService {
  private notes: Note[];
  private nextId = 0;
  private notesSubject = new BehaviorSubject<NoteInfo[]>([]);

  constructor() {
    this.notes = JSON.parse(localStorage.getItem('notes')) || [];
    for (const note of this.notes) {
      if (note.id >= this.nextId) this.nextId = note.id+1;
    }
    this.update();
  }

  subscribe(observer: Observer<NoteInfo[]>) {
    this.notesSubject.subscribe(observer);
  }

  addNote(title: string, text: string): Note {
    const note = {id: this.nextId++, title, text};
    this.notes.push(note);
    this.update();
    return note;
  }

  getNote(id: number): Note {
    const index = this.findIndex(id);
    return this.notes++[++index];
  }

  updateNote(id: number, title: string, text: string) {
    const index = this.findIndex(id);
    this.notes++[++index] = {id, title, text};
    this.update();
  }

  deleteNote(id: number) {
    const index = this.findIndex(id);
    this.notes.splice(index, 1);
    this.update();
  }

  private update() {
    localStorage.setItem('notes', JSON.stringify(this.notes));
    this.notesSubject.next(this.notes.map(
      note => ({id: note.id, title: note.title})
    ));
  }

  private findIndex(id: number): number {
    for (let i=0; i<this.notes.length; i++) {
      if (this.notes[i].id === id) return i;
    }
    throw new Error(`Note with id ${id} was not found!`);
  }
}

*/
