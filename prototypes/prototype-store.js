
/* Local prototype data only; no network requests or real mail. */
window.Demo=(()=>{
const key='birthday16-admin-prototype-v1';
const names=['陈思远','林嘉怡','王泽宇','李雨桐','周子墨','张若溪','刘奕辰','赵书宁','吴景行','徐知夏','杨明轩','许清和','孙亦安','郑星野','何沐晴','沈以南','梁予安','宋嘉言','唐时雨','顾云舟','陆知遥','苏慕白','江晚宁','程砚秋'];
const status=['NOT_SENT','SUCCESS','NOT_SENT','PENDING','SUCCESS','FAILED','NOT_SENT','SUCCESS'];
const now=()=>new Date().toLocaleString('sv-SE',{timeZone:'Asia/Shanghai'}).slice(0,16);
const seed=()=>({
receipts:names.map((name,i)=>({id:String(i+1),name,phone:String(13800138001+i),email:'alumni'+String(i+1).padStart(2,'0')+'@example.com',attendance:i%4===3?'NOT_ATTENDING':'ATTENDING',gift:i%4===3?'MAIL':['PICKUP','MAIL','NONE'][i%3],status:status[i%8],version:1,updated:'2026-11-21 '+String(14-Math.floor(i/5)).padStart(2,'0')+':'+String(58-i*2).padStart(2,'0'),address:'天津市西青区 · 演示邮寄地址',history:status[i%8]==='NOT_SENT'?[]:[{id:'mail-'+i,version:1,sendNo:1,status:status[i%8],recipient:'alumni'+String(i+1).padStart(2,'0')+'@example.com',confirmed:'2026-11-21 10:20',operator:'管理员',sentAt:status[i%8]==='SUCCESS'?'2026-11-21 10:21':null}]})),
honors:[
{id:'h1',title:'中国大学生计算机设计大赛 · 全国二等奖',people:'陈思远、林嘉怡、王泽宇',images:['assets/honor-certificate.svg','assets/honor-team.svg'],version:1,updated:'2026-11-20 16:45'},
{id:'h2',title:'中国国际大学生创新大赛 · 银奖',people:'周子墨、张若溪、刘奕辰',images:['assets/honor-innovation.svg'],version:1,updated:'2026-11-19 14:20'},
{id:'h3',title:'全国大学生软件创新大赛 · 一等奖',people:'赵书宁、吴景行',images:['assets/honor-certificate.svg','assets/honor-team.svg','assets/honor-innovation.svg'],version:2,updated:'2026-11-18 10:32'},
{id:'h4',title:'优秀学生科技社团',people:'SIPC 全体成员',images:['assets/honor-innovation.svg','assets/honor-team.svg'],version:1,updated:'2026-11-16 09:15'},
{id:'h5',title:'大学生程序设计竞赛 · 金奖',people:'徐知夏、杨明轩、许清和',images:['assets/honor-certificate.svg'],version:1,updated:'2026-11-14 18:30'}
]});
let state;
try{const saved=localStorage.getItem(key);state=saved?JSON.parse(saved):seed();if(!Array.isArray(state.receipts)||!Array.isArray(state.honors))state=seed()}catch(e){state=seed()}
const clone=v=>JSON.parse(JSON.stringify(v));
const persist=()=>{try{localStorage.setItem(key,JSON.stringify(state))}catch(e){throw new Error('本地原型存储空间不足，请减少图片大小后重试。')}};
return{now,saveMailBatch(messages){
const old=clone(state);
try{
 for(const message of messages){
  const receipt=state.receipts.find(r=>r.id===message.invitationId);
  if(!receipt||receipt.version!==message.version||receipt.email!==message.recipient)throw new Error('报名资料已更新，请重新预览后确认。');
  receipt.history.push({...clone(message),sendNo:receipt.history.filter(h=>h.version===message.version).length+1,confirmed:now(),operator:'管理员',sentAt:null,status:'PENDING'});
  receipt.status='PENDING';
 }
 persist();
}catch(e){state=old;throw e}
},receipts:()=>clone(state.receipts),honors:()=>clone(state.honors),saveReceipt(r){const old=clone(state);state.receipts=state.receipts.map(x=>x.id===r.id?clone(r):x);try{persist()}catch(e){state=old;throw e}},saveHonor(h){const old=clone(state);const at=state.honors.findIndex(x=>x.id===h.id);if(at<0)state.honors.unshift(clone(h));else state.honors[at]=clone(h);try{persist()}catch(e){state=old;throw e}},deleteHonor(id){state.honors=state.honors.filter(h=>h.id!==id);persist()},reset(){state=seed();persist()}};
})();
