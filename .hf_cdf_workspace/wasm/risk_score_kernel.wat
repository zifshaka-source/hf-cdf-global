(module
  ;; Deterministic sovereign risk scoring kernel compiled to native WebAssembly binary
  (func (export "compute_risk") (param $severity i32) (param $kevCount i32) (param $mitigated i32) (result i32)
    (local $raw i32)
    ;; raw = severity * 12 + kevCount * 9 - mitigated * 15
    (local.set $raw
      (i32.sub
        (i32.add
          (i32.mul (local.get $severity) (i32.const 12))
          (i32.mul (local.get $kevCount) (i32.const 9))
        )
        (i32.mul (local.get $mitigated) (i32.const 15))
      )
    )
    (local.get $raw)
  )
  (func (export "main") (result i32)
    ;; Example invocation: severity=7, kevCount=3, mitigated=1 -> 84 + 27 - 15 = 96
    (call 0 (i32.const 7) (i32.const 3) (i32.const 1))
  )
)
