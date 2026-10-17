export const statusNames={draft:'草稿',published:'已上架',offline:'已下架',pending:'待付款',ready:'待使用',shipping:'待取货',completed:'已完成',cancelled:'已取消',booked:'已预约',aftersale:'售后处理中'}
export function chineseTime(value,dateOnly=false){
 if(!value)return '—'
 if(/^\d{4}-\d{2}-\d{2}$/.test(value)){const [y,m,d]=value.split('-');return `${y}年${m}月${d}日`}
 const date=new Date(value);if(Number.isNaN(date.getTime()))return '—'
 const p=Object.fromEntries(new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
 return `${p.year}年${p.month}月${p.day}日`+(dateOnly?'':` ${p.hour}时${p.minute}分${p.second}秒`)
}
export function formatBusiness(row,key,refs={}){
 const v=row[key],find=(type,id)=>refs[type]?.find(x=>x.id===id)
 if(key==='staff')return row.staff?.name||'未指定员工'
 if(key==='durationMinutes')return (Number(v)||60)+'分钟'
 if(key==='userId')return find('users',v)?.name||'未关联会员'
 if(key==='storeId')return find('stores',v)?.name||'原门店信息已变更'
 if(key==='orderId')return find('orders',v)?.number||'原订单信息已变更'
 if(key==='productIds')return (v||[]).map(id=>find('products',id)?.name||'已下架商品').join('、')||'—'
 if(key==='type')return {trial:'体验卡',vip:'贵宾卡'}[v]||v
 if(key==='productId')return find('products',v)?.name||'未关联商品'
 if(key==='categoryId')return find('categories',v)?.name||'未分类'
 if(key==='product')return v?.name||'—'
 if(key==='status')return statusNames[v]||'待发放'
 if(key==='kind')return {service:'服务项目',goods:'实物商品'}[v]||'—'
 if(key==='spec'&&row.package)return row.package.planName
 if(key==='spec')return {single:row.product?.kind==='goods'?'一件':'单次服务',course:'一个疗程'}[v]||'—'
 if(key==='gender')return {male:'先生',female:'女士'}[v]||'未填写'
 if(key==='outcome')return {success:'成功',failure:'失败',cancel:'取消'}[v]||v
 if(key==='mode')return v==='mock'?'模拟支付（测试）':v
 if(key==='paymentMode')return {mock:'模拟支付（测试，不扣款）',offline:'线下收款',weixin:'微信支付',wechat:'微信支付',demo:'历史记录'}[v]||'尚未收款'
 if(key==='createdAt'||key==='paidAt'||key==='completedAt'||key==='lastSign'||key==='lastSignAt')return chineseTime(v)
 if(key==='appointmentTime')return row.date?chineseTime(`${row.date}T${row.time||'00:00'}:00+08:00`):'—'
 if(key==='address')return v?[v.name,v.phone,v.city,v.detail].filter(Boolean).join('，'):'到店服务，无需收货地址'
 if(key==='enabled')return v?'已上架':'已下架'
 if(key==='freeShipping')return v?'包邮':'不包邮'
 if(key==='disabled')return v?'已停用':'正常使用'
 if(key==='invited')return v?'可以领取':'不可领取'
 if(key==='home')return v?'在首页显示':'不在首页显示'
 if(key==='gift'||key==='trial')return v?'参与':'不参与'
 if(key==='isDefault')return v?'默认地址':'普通地址'
 if(['price','memberPrice','referencePrice','coursePrice','total','amount'].includes(key))return v==null?'未设置':`¥${Number(v).toFixed(2)}`
 if(typeof v==='boolean')return v?'是':'否'
 if(v==null||v==='')return '—'
 return typeof v==='object'?'—':String(v)
}
export const detailFields={
 paymentAudits:['orderId','userId','outcome','mode','amount','transactionId','createdAt'],
 products:['name','subtitle','kind','categoryId','referencePrice','price','coursePrice','stock','sold','enabled','home','gift','trial','description'],
 stores:['name','contact','phone','address','hours'],
 users:['name','phone','gender','invited','disabled','createdAt'],
 orders:['number','userId','product','quantity','spec','price','total','status','storeId','address','message','paymentMode','paymentTransactionId','paymentNote','tracking','refundStatus','refundNote','refundAt','createdAt','paidAt','completedAt'],
 appointments:['name','userId','storeId','appointmentTime','status','orderId'],
 addresses:['userId','name','phone','city','detail','isDefault'],
 claims:['userId','type','productIds','status','createdAt','completedAt'],
 categories:['name','sort','enabled'],
 activities:['name','description','productId','startAt','endAt','enabled'],alliances:['name','phone','description','enabled'],
 shares:['userId','name','createdAt'],earnings:['userId','name','amount','createdAt']
}



