const admin=require('firebase-admin');
admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))});
const TZ='America/Bogota';
const fecha=n=>new Date(Date.now()+n*864e5).toLocaleDateString('en-CA',{timeZone:TZ});
const $=v=>'$'+Number(v).toLocaleString('es-CO');
const lista=(a,f)=>a.slice(0,8).map(f).join(', ')+(a.length>8?' y '+(a.length-8)+' más':'');
async function main(){
  const db=admin.firestore(),hoy=fecha(0),man=fecha(1),snap=await db.collection('agendas').get();
  let enviados=0;
  for(const doc of snap.docs){
    const a=doc.data(),c=a.nfc||{},pend=a.pend||[],L=[];
    if(!a.tk)continue;
    const t=pend.filter(x=>x.d===man),m=pend.filter(x=>x.d<hoy);
    if(c.t&&t.length)L.push('Mañana vencen: '+lista(t,x=>x.n+' '+$(x.v)));
    if(c.m&&m.length)L.push('En mora: '+lista(m,x=>x.n+' '+$(x.v)));
    if(c.p&&(a.p||[]).length)L.push('Por finalizar: '+lista(a.p,x=>x.n));
    if(c.f&&(a.f||[]).length)L.push('Paz y salvo: '+lista(a.f,x=>x.n));
    if(c.c&&(a.c||[]).length)L.push('Pueden acceder a crédito: '+a.c.length+' cliente(s)');
    if(!L.length)continue;
    try{
      await admin.messaging().send({token:a.tk,data:{title:'Cobros · resumen del día',body:L.join('\n')},webpush:{headers:{Urgency:'high'}}});
      enviados++;
    }catch(e){
      console.error('Error al enviar:',e.code||e.message);
      if(/registration-token-not-registered|invalid-argument/.test(e.code||''))await doc.ref.update({tk:admin.firestore.FieldValue.delete()});
    }
  }
  console.log('Avisos enviados:',enviados,'de',snap.size,'agenda(s).');
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
