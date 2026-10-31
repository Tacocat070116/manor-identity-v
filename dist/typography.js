// Space visible dot separators without changing stored copy, form values or URLs.
export function spaceSeparators(root){
 const doc=root.ownerDocument||root,walker=doc.createTreeWalker(root,4),nodes=[];
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  if(/[·•]/.test(node.data)&&!node.parentElement?.closest('script,style,textarea,input,select,code,pre,[contenteditable],.text-separator,svg'))nodes.push(node);
 }
 for(const node of nodes){
  const fragment=doc.createDocumentFragment();
  for(const part of node.data.split(/([·•])/)){
   if(part==='·'||part==='•'){const span=doc.createElement('span');span.className='text-separator';span.textContent=part;fragment.append(span);}
   else fragment.append(doc.createTextNode(part));
  }
  node.replaceWith(fragment);
 }
}

if(globalThis.document?.body&&globalThis.MutationObserver){
 const root=document.body,settings={childList:true,subtree:true,characterData:true};
 const observer=new MutationObserver(records=>{
  observer.disconnect();
  const roots=new Set(records.flatMap(record=>record.type==='characterData'?[record.target.parentElement]:[...record.addedNodes].map(n=>n.nodeType===3?n.parentElement:n)).filter(n=>n?.isConnected&&n.nodeType===1));
  for(const node of roots)spaceSeparators(node);
  observer.observe(root,settings);
 });
 spaceSeparators(root);observer.observe(root,settings);
}
