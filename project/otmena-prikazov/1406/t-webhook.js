Jun 10 11:22:26 cv4849007.novalocal npm[232506]: }
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: Signature string: 1000057161130499991130topup-7d226fed-d724-4cb7-b69...
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: Parameters for signature: [
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   'Amount',      'CardId',
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   'ErrorCode',   'ExpDate',
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   'OrderId',     'Pan',
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   'Password',    'PaymentId',
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   'Status',      'Success',
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   'TerminalKey'
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: ]
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: Notification validation: {
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   received: 'eed7088990...',
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   calculated: 'eed7088990...',
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   isValid: true
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: }
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: Webhook error: PrismaClientValidationError:
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: Invalid `prisma.payment.update()` invocation:
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: {
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   where: {
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     id: "cmbq8lrcy00086b0a9t0gubyv"
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   },
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   data: {
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     status: "failed",
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     paymentId: 6507228396
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:                ~~~~~~~~~~
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   }
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: }
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: Argument `paymentId`: Invalid value provided. Expected String, NullableStringFieldUpdateOperationsInput or Null, provided Int.
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at wn (/var/www/imyrist/node_modules/@prisma/client/runtime/library.js:29:1363)
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at $n.handleRequestError (/var/www/imyrist/node_modules/@prisma/client/runtime/library.js:121:6958)
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at $n.handleAndLogRequestError (/var/www/imyrist/node_modules/@prisma/client/runtime/library.js:121:6623)
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at $n.request (/var/www/imyrist/node_modules/@prisma/client/runtime/library.js:121:6307)
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at async l (/var/www/imyrist/node_modules/@prisma/client/runtime/library.js:130:9633)
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at async d (/var/www/imyrist/.next/server/app/api/payments/webhook/route.js:1:1211)
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at async /var/www/imyrist/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:42484
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at async eI.execute (/var/www/imyrist/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:32486)
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at async eI.handle (/var/www/imyrist/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:43737)
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:     at async doRender (/var/www/imyrist/node_modules/next/dist/server/base-server.js:1333:42) {
Jun 10 11:22:26 cv4849007.novalocal npm[232506]:   clientVersion: '5.22.0'
Jun 10 11:22:26 cv4849007.novalocal npm[232506]: }
Jun 10 11:22:35 cv4849007.novalocal systemd[1]: Stopping imyrist.service - ImYrist Next.js Application...
Jun 10 11:22:35 cv4849007.novalocal systemd[1]: imyrist.service: Deactivated successfully.
Jun 10 11:22:35 cv4849007.novalocal systemd[1]: Stopped imyrist.service - ImYrist Next.js Application.
Jun 10 11:22:35 cv4849007.novalocal systemd[1]: imyrist.service: Consumed 1.611s CPU time, 62.7M memory peak, 0B memory swap peak.
Jun 10 11:22:35 cv4849007.novalocal systemd[1]: Started imyrist.service - ImYrist Next.js Application.
Jun 10 11:22:36 cv4849007.novalocal npm[232672]: > imyrist-app@0.1.0 start
Jun 10 11:22:36 cv4849007.novalocal npm[232672]: > next start
Jun 10 11:22:36 cv4849007.novalocal npm[232706]:    ▲ Next.js 14.1.0
Jun 10 11:22:36 cv4849007.novalocal npm[232706]:    - Local:        http://localhost:3000
Jun 10 11:22:37 cv4849007.novalocal npm[232706]:  ✓ Ready in 734ms
