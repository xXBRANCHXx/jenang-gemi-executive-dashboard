<?php
declare(strict_types=1);

require_once __DIR__ . '/partner-db-bootstrap.php';

const JG_PARTNER_STOCK_FILE_MAX_BYTES = 10 * 1024 * 1024;

function jg_partner_stock_db(): PDO
{
    $pdo = jg_partner_db();
    if (!$pdo instanceof PDO) throw new RuntimeException('Partner stock database is unavailable.');
    jg_partner_stock_ensure_schema($pdo);
    return $pdo;
}

function jg_partner_stock_ensure_column(PDO $pdo, string $table, string $column, string $definition): void
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = :column');
    $stmt->execute([':table' => $table, ':column' => $column]);
    if ((int) $stmt->fetchColumn() === 0) $pdo->exec(sprintf('ALTER TABLE `%s` ADD COLUMN `%s` %s', preg_replace('/\W/', '', $table), preg_replace('/\W/', '', $column), $definition));
}

function jg_partner_stock_ensure_schema(PDO $pdo): void
{
    $pdo->exec('CREATE TABLE IF NOT EXISTS partner_wallets (partner_code VARCHAR(64) NOT NULL PRIMARY KEY, balance DECIMAL(14,2) NOT NULL DEFAULT 0.00, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, KEY idx_partner_wallets_updated (updated_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    $pdo->exec('CREATE TABLE IF NOT EXISTS partner_wallet_transactions (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, partner_code VARCHAR(64) NOT NULL, transaction_type VARCHAR(32) NOT NULL, amount DECIMAL(14,2) NOT NULL, balance_after DECIMAL(14,2) NOT NULL, reference_type VARCHAR(32) NOT NULL DEFAULT "", reference_id VARCHAR(80) NOT NULL DEFAULT "", note VARCHAR(500) NOT NULL DEFAULT "", actor VARCHAR(80) NOT NULL DEFAULT "system", created_at DATETIME NOT NULL, UNIQUE KEY uniq_partner_wallet_reference (partner_code, transaction_type, reference_type, reference_id), KEY idx_partner_wallet_activity (partner_code, created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    $pdo->exec('CREATE TABLE IF NOT EXISTS partner_deposit_requests (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, partner_code VARCHAR(64) NOT NULL, requested_amount DECIMAL(14,2) NOT NULL, approved_amount DECIMAL(14,2) NULL DEFAULT NULL, status VARCHAR(32) NOT NULL DEFAULT "pending", proof_name VARCHAR(255) NOT NULL, proof_mime VARCHAR(120) NOT NULL, proof_size BIGINT UNSIGNED NOT NULL DEFAULT 0, proof_data LONGBLOB NOT NULL, review_note VARCHAR(1000) NOT NULL DEFAULT "", submitted_at DATETIME NOT NULL, reviewed_at DATETIME NULL DEFAULT NULL, reviewed_by VARCHAR(80) NOT NULL DEFAULT "", updated_at DATETIME NOT NULL, KEY idx_partner_deposit_queue (status, submitted_at), KEY idx_partner_deposit_history (partner_code, submitted_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    $pdo->exec('CREATE TABLE IF NOT EXISTS partner_stock_events (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, partner_code VARCHAR(64) NOT NULL, entity_type VARCHAR(32) NOT NULL, entity_id VARCHAR(80) NOT NULL, event_type VARCHAR(48) NOT NULL, title VARCHAR(180) NOT NULL, detail VARCHAR(1000) NOT NULL DEFAULT "", actor VARCHAR(80) NOT NULL DEFAULT "system", created_at DATETIME NOT NULL, KEY idx_partner_stock_entity (entity_type, entity_id, created_at), KEY idx_partner_stock_partner (partner_code, created_at)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'order_type', 'VARCHAR(32) NOT NULL DEFAULT "class_a_dropship"');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'recipient_email', 'VARCHAR(190) NOT NULL DEFAULT ""');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'recipient_phone', 'VARCHAR(64) NOT NULL DEFAULT ""');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'recipient_address', 'TEXT NULL DEFAULT NULL');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'shipping_weight_grams', 'INT UNSIGNED NOT NULL DEFAULT 0');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'executive_status', 'VARCHAR(32) NOT NULL DEFAULT "not_required"');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'balance_amount', 'DECIMAL(14,2) NOT NULL DEFAULT 0.00');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'submitted_at', 'DATETIME NULL DEFAULT NULL');
    jg_partner_stock_ensure_column($pdo, 'partner_orders', 'shipment_arranged_at', 'DATETIME NULL DEFAULT NULL');
    jg_partner_stock_ensure_column($pdo, 'partner_order_labels', 'file_data', 'LONGBLOB NULL DEFAULT NULL');
    jg_partner_stock_ensure_column($pdo, 'partner_order_labels', 'uploaded_by', 'VARCHAR(80) NOT NULL DEFAULT "partner"');
}

function jg_partner_stock_money(mixed $value): float
{
    $raw = is_string($value) ? preg_replace('/[^0-9.\-]/', '', $value) : $value;
    if (!is_numeric($raw)) throw new InvalidArgumentException('Enter a valid amount.');
    $amount = round((float) $raw, 2);
    if ($amount <= 0 || $amount > 1000000000000) throw new InvalidArgumentException('Amount must be between Rp 1 and Rp 1,000,000,000,000.');
    return $amount;
}

function jg_partner_stock_event(PDO $pdo, string $partnerCode, string $entityType, string $entityId, string $eventType, string $title, string $detail = '', string $actor = 'executive'): void
{
    $stmt = $pdo->prepare('INSERT INTO partner_stock_events (partner_code, entity_type, entity_id, event_type, title, detail, actor, created_at) VALUES (:code,:entity_type,:entity_id,:event_type,:title,:detail,:actor,UTC_TIMESTAMP())');
    $stmt->execute([':code' => $partnerCode, ':entity_type' => $entityType, ':entity_id' => $entityId, ':event_type' => $eventType, ':title' => mb_substr($title, 0, 180), ':detail' => mb_substr($detail, 0, 1000), ':actor' => mb_substr($actor, 0, 80)]);
}

function jg_partner_stock_events(PDO $pdo, string $entityType, string $entityId): array
{
    $stmt = $pdo->prepare('SELECT id, event_type, title, detail, actor, created_at FROM partner_stock_events WHERE entity_type = :type AND entity_id = :id ORDER BY created_at ASC, id ASC');
    $stmt->execute([':type' => $entityType, ':id' => $entityId]);
    return array_map(static fn(array $r): array => ['id'=>(int)$r['id'],'event_type'=>(string)$r['event_type'],'title'=>(string)$r['title'],'detail'=>(string)$r['detail'],'actor'=>(string)$r['actor'],'created_at'=>(string)$r['created_at']], $stmt->fetchAll());
}

function jg_partner_stock_deposit(PDO $pdo, int $id): ?array
{
    $stmt=$pdo->prepare('SELECT d.id,d.partner_code,d.requested_amount,d.approved_amount,d.status,d.proof_name,d.proof_mime,d.proof_size,d.review_note,d.submitted_at,d.reviewed_at,d.reviewed_by,d.updated_at,COALESCE(NULLIF(p.name,""),d.partner_code) partner_name FROM partner_deposit_requests d LEFT JOIN partner_profiles p ON p.code=d.partner_code WHERE d.id=:id LIMIT 1');$stmt->execute([':id'=>$id]);$r=$stmt->fetch();if(!is_array($r))return null;
    return ['id'=>(int)$r['id'],'partner_code'=>(string)$r['partner_code'],'partner_name'=>(string)$r['partner_name'],'requested_amount'=>(float)$r['requested_amount'],'approved_amount'=>$r['approved_amount']!==null?(float)$r['approved_amount']:null,'status'=>(string)$r['status'],'proof_name'=>(string)$r['proof_name'],'proof_mime'=>(string)$r['proof_mime'],'proof_size'=>(int)$r['proof_size'],'proof_url'=>'/api/partner-stock/?action=proof&id='.(int)$r['id'],'review_note'=>(string)$r['review_note'],'submitted_at'=>(string)$r['submitted_at'],'reviewed_at'=>(string)($r['reviewed_at']??''),'reviewed_by'=>(string)$r['reviewed_by'],'updated_at'=>(string)$r['updated_at'],'events'=>jg_partner_stock_events($pdo,'deposit',(string)$r['id'])];
}

function jg_partner_stock_order(PDO $pdo, string $id): ?array
{
    $stmt=$pdo->prepare('SELECT o.id,o.partner_code,o.customer_name,o.items_json,o.quantity,o.notes,o.status,o.recipient_email,o.recipient_phone,o.recipient_address,o.shipping_weight_grams,o.executive_status,o.balance_amount,o.submitted_at,o.shipment_arranged_at,o.created_at,o.updated_at,COALESCE(NULLIF(p.name,""),o.partner_code) partner_name,l.id label_id,l.original_name label_name,l.mime_type label_mime,l.size_bytes label_size,l.created_at label_created_at FROM partner_orders o LEFT JOIN partner_profiles p ON p.code=o.partner_code LEFT JOIN partner_order_labels l ON l.order_id=o.id AND l.deleted_at IS NULL WHERE o.id=:id AND o.order_type="class_b_stock" ORDER BY l.created_at DESC LIMIT 1');$stmt->execute([':id'=>$id]);$r=$stmt->fetch();if(!is_array($r))return null;$items=json_decode((string)$r['items_json'],true);
    return ['id'=>(string)$r['id'],'partner_code'=>(string)$r['partner_code'],'partner_name'=>(string)$r['partner_name'],'recipient_name'=>(string)$r['customer_name'],'recipient_email'=>(string)$r['recipient_email'],'recipient_phone'=>(string)$r['recipient_phone'],'recipient_address'=>(string)$r['recipient_address'],'shipping_weight_grams'=>(int)$r['shipping_weight_grams'],'items'=>is_array($items)?array_values(array_filter($items,'is_array')):[],'quantity'=>(int)$r['quantity'],'notes'=>(string)$r['notes'],'status'=>(string)$r['status'],'executive_status'=>(string)$r['executive_status'],'total'=>(float)$r['balance_amount'],'submitted_at'=>(string)($r['submitted_at']??$r['created_at']),'shipment_arranged_at'=>(string)($r['shipment_arranged_at']??''),'created_at'=>(string)$r['created_at'],'updated_at'=>(string)$r['updated_at'],'label'=>(int)($r['label_id']??0)>0?['id'=>(int)$r['label_id'],'name'=>(string)$r['label_name'],'mime_type'=>(string)$r['label_mime'],'size_bytes'=>(int)$r['label_size'],'created_at'=>(string)$r['label_created_at'],'url'=>'/api/partner-stock/?action=label&id='.(int)$r['label_id']]:null,'events'=>jg_partner_stock_events($pdo,'order',(string)$r['id'])];
}

function jg_partner_stock_overview(PDO $pdo, string $partnerCode = ''): array
{
    $params=[];$where=$partnerCode!==''?' WHERE d.partner_code=:code ':'';if($partnerCode!=='')$params[':code']=$partnerCode;$stmt=$pdo->prepare('SELECT d.id FROM partner_deposit_requests d'.$where.' ORDER BY d.submitted_at DESC LIMIT 250');$stmt->execute($params);$deposits=[];foreach($stmt->fetchAll(PDO::FETCH_COLUMN) as $id){$v=jg_partner_stock_deposit($pdo,(int)$id);if($v)$deposits[]=$v;}
    $params=[];$where=' WHERE o.order_type="class_b_stock" ';if($partnerCode!==''){$where.=' AND o.partner_code=:code';$params[':code']=$partnerCode;}$stmt=$pdo->prepare('SELECT o.id FROM partner_orders o'.$where.' ORDER BY o.created_at DESC LIMIT 250');$stmt->execute($params);$orders=[];foreach($stmt->fetchAll(PDO::FETCH_COLUMN) as $id){$v=jg_partner_stock_order($pdo,(string)$id);if($v)$orders[]=$v;}
    $walletSql='SELECT w.partner_code,w.balance,w.updated_at,COALESCE(NULLIF(p.name,""),w.partner_code) partner_name FROM partner_wallets w LEFT JOIN partner_profiles p ON p.code=w.partner_code'.($partnerCode!==''?' WHERE w.partner_code=:code':'').' ORDER BY partner_name';$stmt=$pdo->prepare($walletSql);$stmt->execute($partnerCode!==''?[':code'=>$partnerCode]:[]);$wallets=array_map(static fn(array $r):array=>['partner_code'=>(string)$r['partner_code'],'partner_name'=>(string)$r['partner_name'],'balance'=>(float)$r['balance'],'updated_at'=>(string)$r['updated_at']],$stmt->fetchAll());
    return ['orders'=>$orders,'deposits'=>$deposits,'wallets'=>$wallets,'summary'=>['pending_deposits'=>count(array_filter($deposits,static fn($d)=>in_array($d['status'],['pending','investigating'],true))),'awaiting_orders'=>count(array_filter($orders,static fn($o)=>$o['executive_status']==='awaiting_shipment')),'active_store_ops'=>count(array_filter($orders,static fn($o)=>in_array($o['status'],['IS_LISTED','IS_BEING_FULFILLED'],true))),'total_balance'=>array_sum(array_column($wallets,'balance'))]];
}

function jg_partner_stock_review_deposit(PDO $pdo, int $id, string $action, mixed $amount, string $note, string $actor='executive'): array
{
    $action=strtolower($action);if(!in_array($action,['investigate','approve','reject'],true))throw new InvalidArgumentException('Deposit action is invalid.');$note=mb_substr(trim($note),0,1000);
    $pdo->beginTransaction();try{$stmt=$pdo->prepare('SELECT * FROM partner_deposit_requests WHERE id=:id FOR UPDATE');$stmt->execute([':id'=>$id]);$d=$stmt->fetch();if(!is_array($d))throw new InvalidArgumentException('Deposit request not found.');if(in_array((string)$d['status'],['approved','rejected'],true))throw new RuntimeException('This deposit request has already been resolved.');$adjusted=$amount!==null&&$amount!==''?jg_partner_stock_money($amount):(float)($d['approved_amount']??$d['requested_amount']);
        if($action==='investigate'){$u=$pdo->prepare('UPDATE partner_deposit_requests SET status="investigating",approved_amount=:amount,review_note=:note,reviewed_by=:actor,updated_at=UTC_TIMESTAMP() WHERE id=:id');$u->execute([':amount'=>number_format($adjusted,2,'.',''),':note'=>$note,':actor'=>$actor,':id'=>$id]);jg_partner_stock_event($pdo,(string)$d['partner_code'],'deposit',(string)$id,'investigating','Deposit under investigation',$note?:'Executive review started.',$actor);}
        elseif($action==='reject'){$u=$pdo->prepare('UPDATE partner_deposit_requests SET status="rejected",approved_amount=:amount,review_note=:note,reviewed_at=UTC_TIMESTAMP(),reviewed_by=:actor,updated_at=UTC_TIMESTAMP() WHERE id=:id');$u->execute([':amount'=>number_format($adjusted,2,'.',''),':note'=>$note,':actor'=>$actor,':id'=>$id]);jg_partner_stock_event($pdo,(string)$d['partner_code'],'deposit',(string)$id,'rejected','Deposit rejected',$note?:'Payment could not be confirmed.',$actor);}
        else{$wallet=$pdo->prepare('INSERT IGNORE INTO partner_wallets(partner_code,balance,created_at,updated_at)VALUES(:code,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())');$wallet->execute([':code'=>$d['partner_code']]);$lock=$pdo->prepare('SELECT balance FROM partner_wallets WHERE partner_code=:code FOR UPDATE');$lock->execute([':code'=>$d['partner_code']]);$before=(float)$lock->fetchColumn();$after=round($before+$adjusted,2);$u=$pdo->prepare('UPDATE partner_wallets SET balance=:balance,updated_at=UTC_TIMESTAMP() WHERE partner_code=:code');$u->execute([':balance'=>number_format($after,2,'.',''),':code'=>$d['partner_code']]);$tx=$pdo->prepare('INSERT INTO partner_wallet_transactions(partner_code,transaction_type,amount,balance_after,reference_type,reference_id,note,actor,created_at)VALUES(:code,"deposit",:amount,:after,"deposit",:reference,"Approved balance deposit",:actor,UTC_TIMESTAMP())');$tx->execute([':code'=>$d['partner_code'],':amount'=>number_format($adjusted,2,'.',''),':after'=>number_format($after,2,'.',''),':reference'=>(string)$id,':actor'=>$actor]);$u=$pdo->prepare('UPDATE partner_deposit_requests SET status="approved",approved_amount=:amount,review_note=:note,reviewed_at=UTC_TIMESTAMP(),reviewed_by=:actor,updated_at=UTC_TIMESTAMP() WHERE id=:id');$u->execute([':amount'=>number_format($adjusted,2,'.',''),':note'=>$note,':actor'=>$actor,':id'=>$id]);jg_partner_stock_event($pdo,(string)$d['partner_code'],'deposit',(string)$id,'approved','Deposit approved',($adjusted!==(float)$d['requested_amount']?'Approved with corrected amount. ':'').$note,$actor);}
        $pdo->commit();return jg_partner_stock_deposit($pdo,$id)??[];
    }catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}

function jg_partner_stock_pdf(array $file): array
{
    if((int)($file['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_OK)throw new InvalidArgumentException('Upload a shipping label PDF.');$tmp=(string)($file['tmp_name']??'');$size=(int)($file['size']??0);if($tmp===''||!is_file($tmp)||$size<=0)throw new InvalidArgumentException('Shipping label PDF is empty.');if($size>JG_PARTNER_STOCK_FILE_MAX_BYTES)throw new InvalidArgumentException('Shipping label must be 10 MB or smaller.');$data=@file_get_contents($tmp);if(!is_string($data)||substr($data,0,5)!=='%PDF-')throw new InvalidArgumentException('Shipping label must be a valid PDF.');return ['name'=>mb_substr(trim((string)($file['name']??'shipping-label.pdf')),0,255),'mime'=>'application/pdf','size'=>$size,'data'=>$data];
}

function jg_partner_stock_arrange_shipment(PDO $pdo, string $orderId, array $file, string $actor='executive'): array
{
    $label=jg_partner_stock_pdf($file);$pdo->beginTransaction();try{$stmt=$pdo->prepare('SELECT partner_code,status,executive_status FROM partner_orders WHERE id=:id AND order_type="class_b_stock" FOR UPDATE');$stmt->execute([':id'=>$orderId]);$o=$stmt->fetch();if(!is_array($o))throw new InvalidArgumentException('Class B order not found.');if((string)$o['executive_status']!=='awaiting_shipment')throw new RuntimeException('Shipment has already been arranged for this order.');$ins=$pdo->prepare('INSERT INTO partner_order_labels(order_id,partner_code,original_name,stored_name,relative_path,mime_type,size_bytes,file_data,uploaded_by,expires_at,created_at)VALUES(:order_id,:code,:name,:stored,:path,:mime,:size,:data,"executive",NULL,UTC_TIMESTAMP())');$ins->bindValue(':order_id',$orderId);$ins->bindValue(':code',$o['partner_code']);$ins->bindValue(':name',$label['name']);$ins->bindValue(':stored','executive-'.$orderId.'.pdf');$ins->bindValue(':path','api/label-file/?order_id='.rawurlencode($orderId));$ins->bindValue(':mime',$label['mime']);$ins->bindValue(':size',$label['size'],PDO::PARAM_INT);$ins->bindValue(':data',$label['data'],PDO::PARAM_LOB);$ins->execute();$u=$pdo->prepare('UPDATE partner_orders SET status="IS_LISTED",executive_status="shipment_arranged",shipment_arranged_at=UTC_TIMESTAMP(),deadline_at=DATE_ADD(UTC_TIMESTAMP(),INTERVAL 48 HOUR),updated_at=UTC_TIMESTAMP() WHERE id=:id');$u->execute([':id'=>$orderId]);jg_partner_stock_event($pdo,(string)$o['partner_code'],'order',$orderId,'shipment_arranged','Shipment arranged','Shipping label uploaded; order released to Store Ops.',$actor);$pdo->commit();return jg_partner_stock_order($pdo,$orderId)??[];}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();throw $e;}
}

function jg_partner_stock_stream(PDO $pdo, string $table, int $id): never
{
    if($table==='deposit'){$stmt=$pdo->prepare('SELECT proof_name name,proof_mime mime,proof_data data FROM partner_deposit_requests WHERE id=:id');}
    else{$stmt=$pdo->prepare('SELECT original_name name,mime_type mime,file_data data FROM partner_order_labels WHERE id=:id AND file_data IS NOT NULL');}$stmt->execute([':id'=>$id]);$f=$stmt->fetch();if(!is_array($f))throw new RuntimeException('File not found.');$data=(string)$f['data'];$name=preg_replace('/[^A-Za-z0-9._ -]+/','-',(string)$f['name'])?:'document';header('Content-Type: '.(string)$f['mime']);header('Content-Length: '.strlen($data));header('Content-Disposition: inline; filename="'.addcslashes($name,"\"\\").'"');header('Cache-Control: private, no-store');header('X-Content-Type-Options: nosniff');header('Content-Security-Policy: sandbox');echo $data;exit;
}

function jg_partner_stock_notifications(PDO $pdo): array
{
    $events=[];$stmt=$pdo->query('SELECT id FROM partner_deposit_requests WHERE status IN("pending","investigating") ORDER BY submitted_at DESC');foreach($stmt->fetchAll(PDO::FETCH_COLUMN) as $id){$d=jg_partner_stock_deposit($pdo,(int)$id);if($d)$events[]=['id'=>'deposit:'.$d['id'],'record_id'=>$d['id'],'type'=>'balance_deposit','partner_code'=>$d['partner_code'],'partner_name'=>$d['partner_name'],'amount'=>$d['approved_amount']??$d['requested_amount'],'created_at'=>$d['submitted_at'],'status'=>$d['status'],'proof'=>['url'=>$d['proof_url'],'name'=>$d['proof_name'],'mime_type'=>$d['proof_mime'],'size_bytes'=>$d['proof_size']],'detail_url'=>'/partner-stock-orders/?deposit='.$d['id'].'&partner='.rawurlencode($d['partner_code'])];}
    $stmt=$pdo->query('SELECT id FROM partner_orders WHERE order_type="class_b_stock" AND executive_status="awaiting_shipment" ORDER BY submitted_at DESC');foreach($stmt->fetchAll(PDO::FETCH_COLUMN) as $id){$o=jg_partner_stock_order($pdo,(string)$id);if($o)$events[]=['id'=>'stock_order:'.$o['id'],'record_id'=>$o['id'],'type'=>'stock_order','partner_code'=>$o['partner_code'],'partner_name'=>$o['partner_name'],'amount'=>$o['total'],'created_at'=>$o['submitted_at'],'items'=>$o['items'],'recipient_name'=>$o['recipient_name'],'detail_url'=>'/partner-stock-orders/?order='.rawurlencode($o['id']).'&partner='.rawurlencode($o['partner_code'])];}usort($events,static fn($a,$b)=>strcmp((string)$b['created_at'],(string)$a['created_at']));return $events;
}
