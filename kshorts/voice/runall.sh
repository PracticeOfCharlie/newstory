for v in F1 F2 F3 F4 F5; do for s in 1.05 1.25; do
 .venv-wx/bin/python make_voice.py test_script.txt --voice $v --speed $s --out samples/${v}_speed${s}_3sent || echo FAIL $v $s
done; done
