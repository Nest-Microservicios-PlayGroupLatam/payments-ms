import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {

    private readonly stripe = new Stripe(envs.stripeSecret)

 async createPaymentSession(paymentSessionDto: PaymentSessionDto) {

    const { currency, items, orderId } = paymentSessionDto;

    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      // Colocar aquí el ID de mi orden
        payment_intent_data: {
            metadata: {
                orderId: orderId
            },
        },
        line_items: lineItems,
        mode: 'payment',
        success_url: envs.stripeSuccessUrl,
        cancel_url: envs.stripeCancelUrl,

    });

    // return session;
      return{
        cancelUrl: session.cancel_url,
        successUrl: session.success_url,
        url: session.url,
      }

  }

   async stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
        return res.status(400).send('Missing Stripe Signature');
        }

    let event: Stripe.Event;

    
    // Real
    // const endpointSecret = envs.stripeEndpointSecret;
    // const endpointSecret = "whsec_18418817869d1f68f80d638d129b804350a355c3cd7877ffd78f7e06368c2164"; 
    // const endpointSecret = "whsec_yioadcJSyvpbdc5GLB0me9IWI4wnDQ6b";
    const endpointSecret = envs.stripeEndpointSecret;
    

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret,
      );
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // console.log({event});

    switch( event.type ) {
      case 'charge.succeeded': 
      console.log(event);
        const chargeSucceeded = event.data.object;
        // TODO: llamar nuestro microservicio
        console.log({
          metadata: chargeSucceeded.metadata,
          orderId: chargeSucceeded.metadata.orderId,
        });
      break;
      
      default:
        console.log(`Event ${ event.type } not handled`);
    }

    return res.status(200).send({sig});
  }

}
