(()=>{
const UI=PrototypeUI,viewport=document.getElementById('log-viewport'),container=document.getElementById('log-lines');
let entries=[],sequence=0,tick=0;
const time=date=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date)+'.'+String(date.getMilliseconds()).padStart(3,'0');
const trace=()=>crypto.randomUUID?.()||'demo-request-'+String(Date.now());
const seed=[];
const base=Date.now()-240000;
function add(level,module,message,offset,request=''){seed.push({at:new Date(base+offset),level,module,message,trace:request})}
add('INFO','BirthdayApplication','Starting birthday16-api using Java 21',0);
add('INFO','BirthdayApplication','The following profile is active: development',500);
add('INFO','TomcatWebServer','Tomcat initialized with port 16621 (http)',900);
add('INFO','HikariDataSource','HikariPool-1 - Starting...',1500);
add('INFO','HikariPool','HikariPool-1 - Added connection [connection details omitted]',2100);
add('INFO','HikariDataSource','HikariPool-1 - Start completed.',2400);
add('INFO','TomcatWebServer','Tomcat started on port 16621 (http)',3300);
add('INFO','BirthdayApplication','Started BirthdayApplication in 4.675 seconds',4675);
for(let i=0;i<12;i++){
const request=trace(),at=9000+i*11000;
add('INFO','RequestLog','GET /api/v1/admin/invitations?page=1&size=20',at,request);
add('DEBUG','InvitationQueryService','Query completed: rows=20, duration='+(8+i%5)+'ms',at+8,request);
add('INFO','RequestLog','Response completed: status=200, duration='+(12+i%7)+'ms',at+14,request);
}
const confirmation=trace();
add('INFO','EmailService','Mail confirmation recorded: notificationId=1042, invitationId=28, version=2',147000,confirmation);
add('DEBUG','EmailTaskTransactions','Claimed 1 due task; lease acquired',150000);
add('INFO','EmailTaskProcessor','Mail accepted by upstream: notificationId=1042, status=queued',151000,confirmation);
add('WARN','MailApiClient','Status query timed out; keeping last known state and scheduling retry',172000,confirmation);
add('WARN','EmailTaskProcessor','notificationId=1042, state=POLLING, next attempt in 30s',172020,confirmation);
const failed=trace();
add('ERROR','EmailTaskProcessor','Upstream status query failed: notificationId=1041\ncom.sipc115.birthday.email.client.MailIntegrationException: Mail status temporarily unavailable\n    at com.sipc115.birthday.email.client.MailApiClient.status(MailApiClient.java:114)\n    at com.sipc115.birthday.email.task.EmailTaskProcessor.poll(EmailTaskProcessor.java:79)\nCaused by: java.net.SocketTimeoutException: Read timed out\n    ... 4 common frames omitted',185000,failed);
add('INFO','EmailTaskProcessor','Retry scheduled; receipt data remains saved',185020,failed);
add('INFO','MediaService','Image metadata stored: type=image/webp, sourceBytes=184320',192000,trace());
add('INFO','HonorService','Honor updated: entryId=12, version=3, imageCount=4',201000,trace());
add('DEBUG','EmailTaskTransactions','Task scan completed: due=0, availableWorkers=2',211000);
add('INFO','RequestLog','GET /api/v1/health -> status=200, duration=2ms',223000,trace());
function span(className,text){const element=document.createElement('span');element.className=className;element.textContent=text;return element}
function formatted(entry){return time(entry.at)+' '+entry.level.padEnd(5)+' ['+(entry.trace||'main')+'] '+entry.module+' - '+entry.message}
function render(){
container.replaceChildren();let lineNumber=entries.length?entries[0].firstLine:1;
for(const entry of entries){
const lines=entry.message.split('\n');
for(let i=0;i<lines.length;i++){
const row=document.createElement('div');row.className='log-row row-'+entry.level;
row.append(span('log-number',String(lineNumber++).padStart(3,'0')));
const content=span('log-content','');
if(i===0){content.append(span('log-time',time(entry.at)+' '),span('log-level level-'+entry.level,entry.level.padEnd(5)+' '),span('log-trace','['+(entry.trace||'main')+'] '),span('log-module',entry.module+' '),span('log-message','- '+lines[i]))}
else{content.append(span('log-stack',lines[i]))}
row.append(content);container.append(row);
}
}
document.getElementById('log-count').textContent=entries.length+' 条记录 · '+container.childElementCount+' 行';
}
function append(records){
const follow=viewport.scrollHeight-viewport.scrollTop-viewport.clientHeight<50;
for(const record of records){record.firstLine=sequence+1;sequence+=record.message.split('\n').length;entries.push(record)}
if(entries.length>500)entries=entries.slice(-500);
render();if(follow)viewport.scrollTop=viewport.scrollHeight;
}
append(seed);
const timer=setInterval(()=>{
if(document.hidden)return;
tick++;
const request=trace(),at=new Date();
const sample=tick%4===0?{level:'DEBUG',module:'EmailTaskTransactions',message:'Task scan completed: due=0, availableWorkers=2'}:tick%3===0?{level:'INFO',module:'InvitationQueryService',message:'GET /api/v1/admin/invitations -> status=200, rows=20, duration=11ms'}:{level:'INFO',module:'RequestLog',message:'GET /api/v1/health -> status=200, duration=2ms'};
append([{...sample,at,trace:request}]);
},6000);
window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
document.getElementById('download-logs').onclick=()=>{
const text=entries.map(formatted).join('\n')+'\n',url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
const a=document.createElement('a');a.href=url;a.download='birthday16-api-demo-'+time(new Date()).slice(0,19).replace(/[: ]/g,'-')+'.log';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
UI.toast('已下载当前演示日志（.log）');
};
document.querySelector('.exit').onclick=()=>UI.ask('退出登录？','当前仅演示退出确认，不会退出真实 SSO 账户。','确认退出',()=>UI.toast('退出确认已演示'));
})();
