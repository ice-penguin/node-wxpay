var crypto = require("crypto");

//所有待签名参数按照字段名的ASCII 码从小到大排序（字典序）后，使用URL键值对的格式（即key1=value1&key2=value2…）拼接成字符串string1
function sortKey(info){
  var str = "";
  var keyArr = [];
  for (var key in info) {
    if(info[key]==""||!info[key]){
      continue;
    }
    keyArr.push(key);
  }
  keyArr.sort();
  for (var i = 0; i < keyArr.length; i++) {
    if(i>0){
      str += "&";
    }
    str += (keyArr[i]+"="+info[keyArr[i]])
  }
  return  str;
};

function md5(str){
  var md5sum = crypto.createHash("md5");
  md5sum.update(str);
  str = md5sum.digest("hex");
  return str;
}

function sha1(str){
  var sha1sum = crypto.createHash("sha1");
  sha1sum.update(str);
  str = sha1sum.digest("hex");
  return str;
}

function randomString(length) {
　　var len = length || 32;
　　var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
　　var maxPos = $chars.length;
　　var pwd = '';
　　for (var i = 0; i < len; i++) {
　　　　pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
　　}
　　return pwd;
}

var XmlHelper=function(){
 var _arrayTypes={}
 var _self=this;
 /*
 *转换对象为xml
 *@obj 目标对象
 *@rootname 节点名称
 *@arraytypes 配置数组字段子元素的节点名称
 */
 this.parseToXML=function(obj,rootname,arraytypes){
 if(arraytypes){
  _arrayTypes=arraytypes;
 }
 var xml="";
 if(typeof obj!=="undefined"){
  if(Array.isArray(obj)){
  xml+=parseArrayToXML(obj,rootname);
  }else if(typeof obj==="object"){
  xml+=parseObjectToXML(obj,rootname);
  }else{
  xml+=parseGeneralTypeToXML(obj,rootname);
  }
 }
 return xml;
 }
 var parseObjectToXML=function(obj,rootname){
 if(typeof rootname==="undefined"||!isNaN(Number(rootname))){
  rootname="Object";
 }
 var xml="<"+rootname+">";
 if(obj){
  for(var field in obj){
  var value=obj[field];
  if(typeof value!=="undefined"){
   if(Array.isArray(value)){
   xml+=parseArrayToXML(value,field);
   }else if(typeof value==="object"){
   xml+=_self.parseToXML(value,field);
   }else{
   xml+=parseGeneralTypeToXML(value,field);
   }
  }
  }
 }
 xml+="</"+rootname+">";
 return xml;
 }
 var parseArrayToXML=function(array,rootname){
 if(typeof rootname==="undefined"||!isNaN(Number(rootname))){
  rootname="Array";
 }
 var xml="<"+rootname+">";
 if(array){
  var itemrootname=_arrayTypes[rootname];
  array.forEach(function(item){
  xml+=_self.parseToXML(item,itemrootname);
  });
 }
 xml+="</"+rootname+">";
 return xml;
 }
 var parseGeneralTypeToXML=function(value,rootname){
 if(typeof rootname==="undefined"||!isNaN(Number(rootname))){
  rootname=typeof value;
 }
 var xml="<"+rootname+">"+value+"</"+rootname+">";
 return xml;
 }
}

//xmlString 2 Json
function xmlStringToJson(str) {
  var xmlRegex = /<xml>((.*\n?)*)<\/xml>/;
  var xmlObj = xmlRegex.exec(str);
  str = xmlObj[1];
  var strArr = str.split("\n");
  var keyRegex = /<\/(.*)>/;
  var valueRegex = />(<!\[CDATA\[(.*)\]\]>)?((?!CDATA).*)</;
  var obj = {};
  for (var i = 0; i < strArr.length; i++) {
    if(strArr[i] == ""){
      continue;
    }
    var keyObj = keyRegex.exec(strArr[i]);
    
    var valueObj = valueRegex.exec(strArr[i]);

    obj[keyObj[1]] = valueObj[2]||valueObj[3];
  }
  return obj;
};


//按微信加密方式加密，返回大写的加密字符串
//如果存在key，则直接使用该密匙
var objMd5UpperCase = function(info,key){
  return md5(sortKey(info)+"&key="+key).toUpperCase();
}

//暴露xmlHelper
exports.xmlHelper = new XmlHelper();
exports.sortKey = sortKey;
exports.randomString = randomString;
exports.md5 = md5;
exports.sha1 = sha1;
exports.objMd5UpperCase = objMd5UpperCase;
exports.xmlStringToJson = xmlStringToJson;