import { interval, Observable } from 'rxjs'

import { Component, EventEmitter, Output } from '@angular/core'

import { Stock } from './istock'

@Component({
  selector: 'price-quoter',
  template: `<strong>
               <button (click)="buyStocks()">Buy</button>
               {{stockSymbol}} {{lastPrice }}
             </strong>
            `,
  styles: [`:host {background: pink; padding: 5px 15px 15px 15px;}`]
})
//| currency: "USD"
export class PriceQuoterComponent {
  @Output() buy: EventEmitter<Stock> = new EventEmitter();

  stockSymbol = 'IBM';
  lastPrice: number = 88;

  constructor() {
    interval(2000)
      .subscribe(data =>
        this.lastPrice = 100 * Math.random());
  }

  buyStocks(): void {

    const stockToBuy: Stock = {
      stockSymbol: this.stockSymbol,
      bidPrice: this.lastPrice
    };

    this.buy.emit(stockToBuy);
  }
}
