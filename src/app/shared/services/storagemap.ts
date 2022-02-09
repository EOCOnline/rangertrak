// Implementation of https://github.com/cyrilletuzi/angular-async-local-storage/blob/main/docs/MAP_OPERATIONS.md
import { StorageMap } from '@ngx-pwa/local-storage';

export class AngularComponentOrService {

  constructor(private storage: StorageMap) { }

// iterate over keys in storage
this.storage.keys().subscribe({
    next: (key) => {
      console.log(key);
    },
    complete: () => {
      console.log('Done');
    },
  });

// See if key exists in storage:
this.storage.has('someindex').subscribe((result) => {

  if (result) {
    console.log('The key exists :)');
  } else {
    console.log('The key does not exist :(');
  }

});

// Get number of items stored in storage
this.storage.size.subscribe((size) => {

  console.log(size);

});

// Delete ONLY data prefixed with "app_"
import { filter, mergeMap} from 'rxjs'

this.storage.keys().pipe(

  /* Keep only keys starting with 'app_' */
  filter((key) => key.startsWith('app_')),

  /* Remove the item for each key */
  mergeMap((key) => this.storage.delete(key))

).subscribe({
  complete: () => {

    /* Note we don't act in the classic success callback as it will be trigerred for each key,
     * while we want to act only when all the operations are done */
    console.log('Done!');

  }
});




}
