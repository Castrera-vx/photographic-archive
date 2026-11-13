import db from '../db/turso.js';
import { slugify } from './fields.js';

export const mediaUrls=(id)=>({thumb:`/media/thumb/${id}.webp`,medium:`/media/medium/${id}.webp`,large:`/media/large/${id}.webp`});
const BASE=`SELECT p.*,c.slug AS category_slug,c.name AS category_name,col.slug AS collection_slug,col.name AS collection_name
FROM photos p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN collections col ON col.id=p.collection_id`;
export const toPublic=(p)=>({id:p.id,title:p.title,description:p.description,capturedAt:p.captured_at,location:p.location,
category:p.category_slug?{slug:p.category_slug,name:p.category_name}:null,
collection:p.collection_slug?{slug:p.collection_slug,name:p.collection_name}:null,
camera:p.camera,lens:p.lens,aperture:p.aperture,shutter:p.shutter,iso:p.iso,focalLength:p.focal_length,
originalFormat:p.original_format,width:p.width,height:p.height,isFavorite:!!p.is_favorite,isFeatured:!!p.is_featured,urls:mediaUrls(p.id)});

export async function listPhotos({category,collection,q,favorite,featured,sort,limit}={}) {
 const where=[],args=[];
 if(category){where.push('c.slug = ?');args.push(category);}
 if(collection){where.push('col.slug = ?');args.push(collection);}
 if(favorite)where.push('p.is_favorite=1');
 if(featured)where.push('p.is_featured=1');
 if(q){const like=`%${q.replace(/[\\%_]/g,'\\$&')}%`;where.push("(p.title LIKE ? ESCAPE '\\' OR p.description LIKE ? ESCAPE '\\')");args.push(like,like);}
 let sql=`${BASE}${where.length?` WHERE ${where.join(' AND ')}`:''} ORDER BY COALESCE(p.captured_at,p.created_at) ${sort==='asc'?'ASC':'DESC'},p.id`;
 const n=Math.min(Math.max(parseInt(limit,10)||0,0),500);if(n){sql+=' LIMIT ?';args.push(n);}
 const r=await db.execute({sql,args});return {total:r.rows.length,photos:r.rows.map(toPublic)};
}
export async function getPhoto(id){const r=await db.execute({sql:`${BASE} WHERE p.id=?`,args:[id]});return r.rows[0]?toPublic(r.rows[0]):null;}
export async function insertPhoto(p){
 const tx=await db.transaction('write');
 try{
  await tx.execute({sql:`INSERT INTO photos(id,title,captured_at,camera,lens,aperture,shutter,iso,focal_length,original_format,width,height)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,args:[p.id,p.title,p.captured_at??null,p.camera??null,p.lens??null,p.aperture??null,p.shutter??null,p.iso??null,p.focal_length??null,p.original_format,p.width,p.height]});
  for(const a of p.assets||[])await tx.execute({sql:'INSERT INTO photo_assets(photo_id,variant,mime_type,data) VALUES(?,?,?,?)',args:[p.id,a.variant,a.mimeType,a.data]});
  await tx.commit();
 }catch(e){await tx.rollback();throw e;}finally{tx.close();}
}
export async function getPhotoAsset(id,variant){const r=await db.execute({sql:'SELECT mime_type,data FROM photo_assets WHERE photo_id=? AND variant=?',args:[id,variant]});return r.rows[0]??null;}
export async function updatePhoto(id,patch){
 const {category,collection,...cols}=patch;
 if('category'in patch){const r=category?await db.execute({sql:'SELECT id FROM categories WHERE slug=?',args:[category]}):null;if(category&&!r.rows.length)throw new Error('Categoria desconocida');cols.category_id=r?.rows[0]?.id??null;}
 if('collection'in patch){const r=collection?await db.execute({sql:'SELECT id FROM collections WHERE slug=?',args:[collection]}):null;if(collection&&!r.rows.length)throw new Error('Coleccion desconocida');cols.collection_id=r?.rows[0]?.id??null;}
 const keys=Object.keys(cols);if(keys.length){const r=await db.execute({sql:`UPDATE photos SET ${keys.map(k=>`${k}=?`).join(',')} WHERE id=?`,args:[...keys.map(k=>cols[k]),id]});if(!r.rowsAffected)return null;}return getPhoto(id);
}
export async function deletePhoto(id){const r=await db.execute({sql:'DELETE FROM photos WHERE id=?',args:[id]});if(r.rowsAffected)await db.execute({sql:'UPDATE collections SET cover_photo_id=NULL WHERE cover_photo_id=?',args:[id]});return r.rowsAffected>0;}
export async function createCollection({name,description=''}){const base=slugify(name);let slug=base,i=2;while((await db.execute({sql:'SELECT 1 FROM collections WHERE slug=?',args:[slug]})).rows.length)slug=`${base}-${i++}`;await db.execute({sql:'INSERT INTO collections(slug,name,description) VALUES(?,?,?)',args:[slug,name,description]});return {slug,name,description};}
export async function updateCollection(slug,patch){const keys=Object.keys(patch);if(keys.length){const r=await db.execute({sql:`UPDATE collections SET ${keys.map(k=>`${k}=?`).join(',')} WHERE slug=?`,args:[...keys.map(k=>patch[k]),slug]});if(!r.rowsAffected)return null;}const r=await db.execute({sql:'SELECT slug,name,description FROM collections WHERE slug=?',args:[slug]});return r.rows[0]??null;}
export async function deleteCollection(slug){const r=await db.execute({sql:'DELETE FROM collections WHERE slug=?',args:[slug]});return r.rowsAffected>0;}
