<?php
declare(strict_types=1);

/**
 * Editable operating guidance for Accounting categories.
 *
 * Account codes in the category names belong to the company's own chart of
 * accounts. They are useful identifiers, but are not treated as universal
 * statutory codes. Defaults are deliberately operational and can be replaced
 * by an accountant in Accounting settings.
 */

/** @param array<string,mixed> $category */
function jg_accounting_category_account_code(array $category): string
{
    $stored = trim((string) ($category['account_code'] ?? ''));
    if ($stored !== '') return mb_substr($stored, 0, 32);
    $haystack = trim((string) ($category['name'] ?? ''));
    if (preg_match('/(?:^|[^0-9])([0-9]{4,8})(?:[^0-9]|$)/u', $haystack, $match) === 1) {
        return (string) $match[1];
    }
    return '';
}

/** @param array<string,mixed> $category @return array<string,mixed> */
function jg_accounting_default_category_guidance(array $category): array
{
    $name = trim((string) ($category['name'] ?? 'Category')) ?: 'Category';
    $code = jg_accounting_category_account_code($category);
    $cleanName = trim((string) preg_replace('/\s*[-–—]\s*[0-9]{4,8}\s*$/u', '', $name)) ?: $name;
    $type = strtolower(trim((string) ($category['type'] ?? 'other')));
    $flow = strtolower(trim((string) ($category['flow'] ?? 'expense'))) === 'income' ? 'income' : 'expense';
    $search = mb_strtolower($cleanName . ' ' . (string) ($category['category_key'] ?? '') . ' ' . $code);
    $codeLabel = $code !== '' ? "Internal account code {$code}. " : '';

    $guidance = [
        'category_id' => (int) ($category['id'] ?? 0),
        'account_code' => $code,
        'hover_summary' => $codeLabel . ($flow === 'income'
            ? "Use for money earned or received that belongs specifically to {$cleanName}."
            : "Use for business costs that belong specifically to {$cleanName}."),
        'definition' => $flow === 'income'
            ? "{$cleanName} records income or another business inflow whose economic substance matches this category. Classify the substance of the transaction, not merely the vendor, bank description, or payment method."
            : "{$cleanName} records a business outflow or expense whose economic substance matches this category. Classify the reason for the cost, not merely the vendor, bank description, or payment method.",
        'when_to_use' => "Use this category when:\n• The transaction's primary purpose matches {$cleanName}.\n• The amount belongs to this reporting period, or an accrual is being recorded for this period.\n• The vendor/source, amount, date, business purpose, and supporting evidence can be identified.\n• A more specific category does not describe the transaction better.",
        'when_not_to_use' => "Do not use this category when:\n• Another category describes the transaction more precisely.\n• The payment is a transfer between company-owned accounts.\n• The amount is an owner draw, owner contribution, loan principal, refundable deposit, or asset purchase unless this category explicitly represents that item.\n• Several purposes are combined and should be split into separate lines.\n• The only reason for choosing it is that the bank narration or vendor name looks familiar.",
        'examples' => "Examples to include:\n• A normal, approved {$cleanName} transaction for company operations.\n• A period-end accrual supported by a calculation or supplier/employee schedule.\n• A correction that moves a verified amount into this category with a clear note.\n\nExamples to exclude:\n• Personal spending or owner withdrawals.\n• Internal bank or cash transfers.\n• Unsupported estimates, duplicate payments, or transactions belonging to another period.",
        'documentation' => "Keep enough evidence for a reviewer to reconstruct the transaction:\n• Invoice, receipt, payroll schedule, agreement, or other source document as applicable.\n• Proof of payment and the payment account used.\n• Transaction date, counterparty, business purpose, brand/channel, and approver.\n• Tax invoice or withholding evidence when applicable.\n• A calculation and explanation for accruals, allocations, corrections, or split entries.",
        'accounting_treatment' => $flow === 'income'
            ? "Typical posting: debit cash/bank or receivable; credit the appropriate income, liability, equity, or contra-expense account according to the transaction's substance. Record income when earned under the entity's accounting policy, not automatically when cash arrives. Reconcile settlements to invoices/orders and keep taxes or marketplace deductions separate."
            : "Typical posting: debit the appropriate expense, inventory, prepaid expense, or asset account; credit cash/bank or accounts payable. Use the entity's accrual and materiality policies to decide timing. Capital items, prepayments, inventory, deposits, loan principal, and recoverable taxes should not be forced into an immediate expense merely because cash left the bank.",
        'tax_legal_notes' => "Operational reminder only—not legal or tax advice. Confirm deductibility, withholding, VAT treatment, employee classification, and document retention against the facts and rules in force for the transaction date. Jenang Gemi's {$codeLabel}label is an internal chart-of-accounts identifier and may require a different mapping in tax filings or external financial statements.",
        'controls' => "Reviewer checks:\n• Correct category, period, counterparty, amount, and payment account.\n• No duplicate transaction or duplicate supporting document.\n• Required approval and receipt are attached.\n• Any tax, withholding, accrual, allocation, or capitalization decision is documented.\n• Unusual values, manual corrections, and related-party items receive a second review.\n• Reconcile the category total to its supporting schedule at month-end.",
        'references' => "Internal source | Jenang Gemi approved chart of accounts and accounting policy\nFinancial reporting | Apply the accounting framework adopted by the entity and the latest accountant-approved policy\nTax administration | https://www.pajak.go.id/",
        'is_customized' => false,
        'updated_at' => null,
    ];

    $isPayroll = preg_match('/gaji|salary|upah|wage|lembur|overtime|tunjangan|allowance|bonus|thr|pegawai|employee|payroll/u', $search) === 1
        || $type === 'payroll' || in_array($code, ['7101', '7102', '7103', '7104', '7105', '7106'], true);
    if ($isPayroll) {
        $guidance['documentation'] = "Minimum payroll evidence:\n• Employment/engagement terms and current compensation approval.\n• Employee or worker identity, work/attendance record, payroll calculation, and payslip or payment list.\n• Bank/cash payment proof and approval.\n• PPh 21 calculation, withholding record, and filing/payment evidence where applicable.\n• BPJS and other statutory contribution support where applicable.\n• Reconciliation from gross entitlement to deductions and net payment.";
        $guidance['accounting_treatment'] = "Typical posting at entitlement/accrual: debit the relevant employee expense; credit payroll payable and separate tax/contribution liabilities. On payment, debit the liabilities and credit bank/cash. Record employer contributions separately from employee deductions. Use a consistent cutoff so work performed in one period is not shifted merely because payroll is paid later.";
        $guidance['tax_legal_notes'] = "Employee-related payments can be subject to PPh 21 and employment rules. Determine whether the recipient is a permanent employee, non-permanent employee, non-employee service provider, or another class from the actual relationship—not from this category label. Recheck rates, gross-up/net arrangements, withholding, BPJS, minimum-wage, overtime, and THR obligations for the transaction date. Internal code {$code} is not a government-prescribed payroll code.";
        $guidance['controls'] = "Payroll reviewer checks:\n• Approved headcount/worker list agrees to the pay run.\n• Rate, days/hours, allowances, deductions, and bank details are independently checked.\n• Departed, duplicate, or ghost workers are excluded.\n• Gross-to-net payroll agrees to bank payment and payroll liabilities.\n• PPh 21 and BPJS schedules reconcile to filings/payments.\n• Changes and one-off payments carry written approval.\n• Payroll data is access-controlled because it contains personal information.";
        $guidance['references'] = "PPh 21 implementation (PMK 168/2023) | https://jdih.kemenkeu.go.id/dok/pmk-168-tahun-2023/view\nPPh 21 effective rates (PP 58/2023) | https://jdih.kemenkeu.go.id/dok/pp-58-tahun-2023/overview\nEmployment, working time and overtime (PP 35/2021) | https://peraturan.bpk.go.id/Details/161904/pp-no-35-tahun-2021\nInternal source | Jenang Gemi approved payroll policy, employment terms, and chart of accounts";
    }

    if ($code === '7101' || preg_match('/gaji karyawan|employee salar|basic salar|gaji pokok/u', $search) === 1) {
        $guidance['hover_summary'] = "Regular employee salary/basic pay. Excludes daily wages, overtime, THR, and separately tracked allowances.";
        $guidance['definition'] = "{$cleanName} is the recurring base salary earned by employees for their normal role and ordinary working schedule. It is the fixed/regular pay component before employee deductions. Use separate accounts for overtime, THR, bonuses, daily labor, or specifically named allowances when those categories exist.";
        $guidance['when_to_use'] = "Use for:\n• Monthly or periodic base salary in an approved employment arrangement.\n• Salary accrued for work already performed but not yet paid.\n• Approved salary adjustments that genuinely change base pay, with effective date support.\n• Final-period base salary through an employee's last working date.";
        $guidance['when_not_to_use'] = "Do not use for:\n• Daily/casual wages (use 7102 if applicable).\n• Overtime (7103), THR (7104), or position allowance (7106).\n• Bonuses, commissions, reimbursements, severance, BPJS employer contributions, or contractor invoices when separately classified.\n• Salary advances or employee loans until their correct receivable/payroll treatment is determined.";
        $guidance['examples'] = "Include: approved August base salary, a month-end salary accrual, or prorated base salary for a starter/leaver.\nExclude: overtime hours, annual THR, meal reimbursement, sales commission, freelance production work, or repayment of an employee advance.";
    } elseif ($code === '7102' || preg_match('/upah harian|daily wage|daily labor|daily labour/u', $search) === 1) {
        $guidance['hover_summary'] = "Pay calculated from approved days/units worked by non-permanent or daily workers—not regular employee salary.";
        $guidance['definition'] = "{$cleanName} records compensation calculated by day, unit, or comparable short work period for workers classified and paid on that basis. The category does not itself determine legal employment status; the actual working relationship and current law do.";
        $guidance['when_to_use'] = "Use when an approved rate is multiplied by verified days, shifts, units, or output and the worker is legitimately handled under the applicable daily/non-permanent arrangement. Accrue verified work performed before period-end even if paid later.";
        $guidance['when_not_to_use'] = "Do not use for regular base salary, overtime premiums, contractor/vendor invoices, unverified cash labor, employee reimbursements, or payments whose worker classification has not been resolved.";
        $guidance['examples'] = "Include: three approved packing shifts at a daily rate; verified short-term production days; an accrual for accepted daily work completed before month-end.\nExclude: a monthly employee salary, overtime added to regular salary, or an independent vendor's service invoice.";
    } elseif ($code === '7103' || preg_match('/lembur|overtime/u', $search) === 1) {
        $guidance['hover_summary'] = "Approved overtime compensation for work beyond normal hours. Requires time, authorization, and rate support.";
        $guidance['definition'] = "{$cleanName} records compensation specifically earned for approved work beyond the normal working schedule. It should remain separate from base salary so hours, authorization, rates, payroll tax, and labor-rule compliance can be reviewed.";
        $guidance['when_to_use'] = "Use only when overtime was authorized, the employee/worker and dates are identified, actual overtime time is evidenced, and the calculation follows the applicable agreement and rules.";
        $guidance['when_not_to_use'] = "Do not use for normal hours, informal flat bonuses, position allowances, shift allowances that are not overtime, unapproved attendance, or vendor/contractor charges. Do not estimate recurring overtime without a supported accrual calculation.";
        $guidance['examples'] = "Include: documented overtime after a production deadline with supervisor approval and a reviewed calculation.\nExclude: a discretionary thank-you payment, ordinary weekend schedule already included in normal terms, or a contractor's rush fee.";
        $guidance['documentation'] .= "\n• Overtime instruction/approval, employee consent where required, date-by-date time record, hourly basis, multiplier, and reviewer sign-off.";
    } elseif ($code === '7104' || preg_match('/tunjangan hari raya|religious holiday allowance|\bthr\b/u', $search) === 1) {
        $guidance['hover_summary'] = "Religious Holiday Allowance (THR). Track eligibility, service period, due date, calculation, approval, and payment separately.";
        $guidance['definition'] = "{$cleanName} records the statutory or policy-based religious holiday allowance paid to eligible workers. It is not ordinary monthly base salary and should be tracked separately for eligibility, timing, calculation, withholding, and annual reconciliation.";
        $guidance['when_to_use'] = "Use for an approved THR entitlement or a supportable period-end THR accrual under the policy adopted by the company. Identify the employee, relevant holiday, service period, calculation basis, due date, and actual payment.";
        $guidance['when_not_to_use'] = "Do not use for ordinary salary, a general performance bonus, gifts to non-workers, customer/vendor hampers, leave allowance, or payments merely made near a holiday without being THR.";
        $guidance['examples'] = "Include: the reviewed THR payroll for eligible employees and a documented THR accrual under the company's accounting policy.\nExclude: Lebaran customer hampers, a discretionary sales bonus, or an employee cash advance.";
        $guidance['references'] = "THR for workers (Permenaker 6/2016) | https://peraturan.bpk.go.id/Home/Download/252116/Kemnaker%20No.%206%20Tahun%202016.pdf\nPPh 21 implementation (PMK 168/2023) | https://jdih.kemenkeu.go.id/dok/pmk-168-tahun-2023/view\nInternal source | Jenang Gemi approved THR policy, payroll calculation, and chart of accounts";
    } elseif ($code === '7106' || preg_match('/tunjangan jabatan|position allowance|role allowance/u', $search) === 1) {
        $guidance['hover_summary'] = "Position/role allowance tied to an approved job assignment. Keep separate from base salary and reimbursements.";
        $guidance['definition'] = "{$cleanName} records an approved allowance attached to a particular role, position, or added responsibility. It should be traceable to the appointment/compensation decision and effective dates, and separated from expense reimbursements and temporary advances.";
        $guidance['when_to_use'] = "Use for a recurring or time-bounded position allowance supported by an appointment letter, compensation approval, eligible period, and payroll calculation.";
        $guidance['when_not_to_use'] = "Do not use for base salary, acting-duty payments that belong in another approved category, expense reimbursements, performance bonuses, THR, overtime, or informal cash top-ups.";
        $guidance['examples'] = "Include: an approved supervisor allowance for the months the employee holds that role.\nExclude: travel reimbursement, a one-off bonus, overtime, or salary itself.";
    }

    if ($type === 'asset' || preg_match('/equipment|peralatan|asset|aset/u', $search) === 1) {
        $guidance['tax_legal_notes'] .= " Assess whether the item should be capitalized and depreciated rather than expensed immediately, using the entity's capitalization threshold, useful-life policy, tax rules, and materiality.";
        $guidance['controls'] .= "\n• For capital items, record custodian/location, asset tag, in-service date, useful life, and disposal evidence.";
    }
    if (preg_match('/tax|pajak|legal|permit|izin/u', $search) === 1) {
        $guidance['hover_summary'] = $codeLabel . "Tax, legal, permit, or compliance cost matching this exact label; identify the obligation and period before posting.";
        $guidance['documentation'] .= "\n• Identify the tax/permit/legal matter, covered period, assessment or engagement, filing/payment reference, and responsible reviewer. Separate taxes paid on behalf of others, recoverable taxes, penalties, and professional fees when their accounting differs.";
    }

    return $guidance;
}

/** @return array<int,array<string,mixed>> */
function jg_accounting_category_guidance_overrides(PDO $pdo): array
{
    try {
        $rows = $pdo->query('SELECT * FROM accounting_category_guidance')->fetchAll();
    } catch (Throwable) {
        return [];
    }
    $byCategory = [];
    foreach ($rows as $row) $byCategory[(int) ($row['category_id'] ?? 0)] = $row;
    return $byCategory;
}

/** @param array<string,mixed> $category @param array<string,mixed>|null $override @return array<string,mixed> */
function jg_accounting_merge_category_guidance(array $category, ?array $override): array
{
    $defaults = jg_accounting_default_category_guidance($category);
    if ($override === null) return $defaults;
    $fields = ['account_code','hover_summary','definition','when_to_use','when_not_to_use','examples','documentation','accounting_treatment','tax_legal_notes','controls','references'];
    foreach ($fields as $field) {
        if (array_key_exists($field, $override) && $override[$field] !== null) $defaults[$field] = (string) $override[$field];
    }
    $defaults['is_customized'] = true;
    $defaults['updated_at'] = $override['updated_at'] ?? null;
    return $defaults;
}

/** @param array<int,array<string,mixed>> $categories @return array<int,array<string,mixed>> */
function jg_accounting_attach_category_guidance(PDO $pdo, array $categories): array
{
    $overrides = jg_accounting_category_guidance_overrides($pdo);
    return array_map(static function (array $category) use ($overrides): array {
        $guidance = jg_accounting_merge_category_guidance($category, $overrides[(int) ($category['id'] ?? 0)] ?? null);
        return [
            ...$category,
            'account_code' => $guidance['account_code'],
            'help_summary' => $guidance['hover_summary'],
            'guidance' => $guidance,
        ];
    }, $categories);
}

/** @return array<string,mixed>|null */
function jg_accounting_category_guidance(PDO $pdo, int $categoryId): ?array
{
    if ($categoryId < 1) return null;
    $stmt = $pdo->prepare(
        'SELECT c.*, p.name AS parent_name
         FROM accounting_categories c
         LEFT JOIN accounting_categories p ON p.id = c.parent_id
         WHERE c.id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $categoryId]);
    $category = $stmt->fetch();
    if (!is_array($category)) return null;
    $overrides = jg_accounting_category_guidance_overrides($pdo);
    $category['id'] = (int) $category['id'];
    $category['parent_id'] = $category['parent_id'] === null ? null : (int) $category['parent_id'];
    return [
        'category' => $category,
        'guidance' => jg_accounting_merge_category_guidance($category, $overrides[$categoryId] ?? null),
    ];
}

/** @param array<string,mixed> $body @return array<string,mixed> */
function jg_accounting_save_category_guidance(PDO $pdo, array $body): array
{
    $categoryId = (int) ($body['category_id'] ?? $body['id'] ?? 0);
    $current = jg_accounting_category_guidance($pdo, $categoryId);
    if ($current === null) jg_accounting_error('Category was not found.', 404, 'category_id');
    $fields = [
        'account_code' => 32,
        'hover_summary' => 500,
        'definition' => 8000,
        'when_to_use' => 8000,
        'when_not_to_use' => 8000,
        'examples' => 8000,
        'documentation' => 8000,
        'accounting_treatment' => 8000,
        'tax_legal_notes' => 8000,
        'controls' => 8000,
        'references' => 8000,
    ];
    $values = [];
    foreach ($fields as $field => $limit) {
        $fallback = $current['guidance'][$field] ?? '';
        $values[$field] = $field === 'account_code'
            ? jg_accounting_text($body[$field] ?? $fallback, $limit)
            : jg_accounting_long_text($body[$field] ?? $fallback, $limit);
    }
    if ($values['hover_summary'] === '') jg_accounting_error('A hover explanation is required.', 422, 'hover_summary');
    if ($values['definition'] === '') jg_accounting_error('A category definition is required.', 422, 'definition');

    $exists = $pdo->prepare('SELECT COUNT(*) FROM accounting_category_guidance WHERE category_id = :category_id');
    $exists->execute([':category_id' => $categoryId]);
    $params = [':category_id' => $categoryId];
    foreach ($values as $field => $value) $params[':' . $field] = $value;
    if ((int) $exists->fetchColumn() > 0) {
        $pdo->prepare(
            'UPDATE accounting_category_guidance SET
                account_code=:account_code, hover_summary=:hover_summary, definition=:definition,
                when_to_use=:when_to_use, when_not_to_use=:when_not_to_use, examples=:examples,
                documentation=:documentation, accounting_treatment=:accounting_treatment,
                tax_legal_notes=:tax_legal_notes, controls=:controls, `references`=:references,
                updated_at=CURRENT_TIMESTAMP
             WHERE category_id=:category_id'
        )->execute($params);
    } else {
        $pdo->prepare(
            'INSERT INTO accounting_category_guidance
                (category_id,account_code,hover_summary,definition,when_to_use,when_not_to_use,examples,
                 documentation,accounting_treatment,tax_legal_notes,controls,`references`,created_at,updated_at)
             VALUES
                (:category_id,:account_code,:hover_summary,:definition,:when_to_use,:when_not_to_use,:examples,
                 :documentation,:accounting_treatment,:tax_legal_notes,:controls,:references,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)'
        )->execute($params);
    }
    jg_accounting_insert_audit($pdo, 'category_guidance', $categoryId, 'update', $current['guidance'], $values);
    return jg_accounting_category_guidance($pdo, $categoryId) ?? [];
}
